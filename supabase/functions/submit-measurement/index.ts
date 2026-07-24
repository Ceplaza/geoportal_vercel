import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Headers": "content-type, authorization, x-client-info, apikey",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN");
  if (!ALLOWED_ORIGIN) {
    console.error("ALLOWED_ORIGIN env var not set");
    return new Response(JSON.stringify({ error: "Server configuration error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const origin = req.headers.get("origin") || "";
  if (origin !== ALLOWED_ORIGIN) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();

    const TECHNICIAN_ACCESS_CODE = Deno.env.get("TECHNICIAN_ACCESS_CODE");
    if (!TECHNICIAN_ACCESS_CODE) {
      console.error("TECHNICIAN_ACCESS_CODE env var not set");
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (typeof body.access_code !== "string" || body.access_code.length > 100) {
      return new Response(JSON.stringify({ error: "Invalid request" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (body.access_code !== TECHNICIAN_ACCESS_CODE) {
      return new Response(JSON.stringify({ error: "Invalid request" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const gid = body.gid;
    const value = body.value;

    if (typeof gid !== "number" || !Number.isInteger(gid) || gid <= 0) {
      return new Response(JSON.stringify({ error: "Invalid request" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
      return new Response(JSON.stringify({ error: "Invalid request" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const unexpectedKeys = Object.keys(body).filter(
      (k) => !["gid", "value", "access_code"].includes(k)
    );
    if (unexpectedKeys.length > 0) {
      return new Response(JSON.stringify({ error: "Invalid request" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rateLimitId = `measurement:${gid}:${req.headers.get("x-forwarded-for") || "unknown"}`;

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: rlResult, error: rlError } = await supabase.rpc(
      "check_and_record_rate_limit",
      {
        p_identifier: rateLimitId,
        p_attempt_type: "measurement",
        p_window_minutes: 10,
        p_max_attempts: 3,
      }
    );

    if (rlError) {
      console.error("Rate limit check failed:", rlError);
      return new Response(JSON.stringify({ error: "Server error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!rlResult?.allowed) {
      return new Response(
        JSON.stringify({
          error: "Too many attempts. Please try again later.",
          rate_limit: {
            attempts_used: rlResult?.attempts_used,
            max_attempts: rlResult?.max_attempts,
            window_minutes: rlResult?.window_minutes,
          },
        }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: existing, error: fetchError } = await supabase
      .from("flora_conteos_anuales")
      .select("gid, year_2026")
      .eq("gid", gid)
      .single();

    if (fetchError && fetchError.code !== "PGRST116") {
      console.error("Fetch existing row failed:", fetchError);
      return new Response(JSON.stringify({ error: "Server error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let updateResult;

    if (existing) {
      updateResult = await supabase
        .from("flora_conteos_anuales")
        .update({ year_2026: value })
        .eq("gid", gid)
        .select("gid, year_2026");
    } else {
      updateResult = await supabase
        .from("flora_conteos_anuales")
        .insert({
          gid: gid,
          year_2026: value,
        })
        .select("gid, year_2026");
    }

    if (updateResult.error) {
      console.error("Database update failed:", updateResult.error);
      return new Response(JSON.stringify({ error: "Server error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!updateResult.data || updateResult.data.length !== 1) {
      console.error("Update verification failed: expected 1 row, got", updateResult.data?.length);
      return new Response(JSON.stringify({ error: "Server error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        gid: updateResult.data[0].gid,
        year_2026: updateResult.data[0].year_2026,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
