// @deno-types="https://deno.land/std@0.168.0/http/server.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// @deno-types="https://esm.sh/@supabase/supabase-js@2"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with, accept',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Max-Age': '86400',
  'Access-Control-Allow-Credentials': 'true',
}

interface EmailRequest {
  to: string;
  subject: string;
  message: string;
  from?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests with more comprehensive headers
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Content-Length': '0'
      }
    })
  }

  try {
    // Validate request method
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Parse request body
    let body: EmailRequest
    try {
      body = await req.json()
    } catch (parseError) {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const { to, subject, message, from = 'notifications@noorcare.com' } = body

    // Validate required fields
    if (!to || !subject || !message) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: to, subject, message' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Missing Supabase environment variables')
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey)

    // Get user from auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)

    if (authError || !user) {
      console.error('Authentication error:', authError)
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Log email attempt
    const emailLogData = {
      user_id: user.id,
      email_address: to,
      subject: subject,
      message: message,
      status: 'pending'
    }

    const { data: logEntry, error: logError } = await supabaseClient
      .from('email_logs')
      .insert([emailLogData])
      .select()
      .single()

    if (logError) {
      console.error('Error logging email attempt:', logError)
      // Continue without logging, but don't fail the request
    }

    // Here you would integrate with your email service provider
    // For now, we'll simulate email sending and log it
    
         // Example with Resend (you need to add RESEND_API_KEY to your environment)
     /*
     const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (resendApiKey) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: from,
          to: [to],
          subject: subject,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333; border-bottom: 2px solid #4F46E5; padding-bottom: 10px;">
                ${subject}
              </h2>
              <div style="margin: 20px 0; line-height: 1.6; color: #555;">
                ${message.replace(/\n/g, '<br>')}
              </div>
              <div style="margin-top: 30px; padding: 15px; background-color: #f8f9fa; border-radius: 5px; font-size: 12px; color: #666;">
                <p>This is an automated notification from NoorCare Daily Pulse System.</p>
                <p>If you no longer wish to receive these emails, you can disable email notifications in your account settings.</p>
              </div>
            </div>
          `,
        }),
      })

      if (res.ok) {
        // Update log entry as sent
        await supabaseClient
          .from('email_logs')
          .update({ 
            status: 'sent', 
            sent_at: new Date().toISOString() 
          })
          .eq('id', logEntry.id)

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Email sent successfully',
            emailId: logEntry.id 
          }),
          { 
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      } else {
        throw new Error(`Email service error: ${res.status}`)
      }
    }
    */

    // For now, just simulate successful email sending
    if (logEntry?.id) {
      try {
        await supabaseClient
          .from('email_logs')
          .update({ 
            status: 'sent', 
            sent_at: new Date().toISOString() 
          })
          .eq('id', logEntry.id)
      } catch (updateError) {
        console.error('Error updating email log:', updateError)
        // Continue without failing the request
      }
    }

    console.log(`📧 Email notification simulated for ${to}: ${subject}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email sent successfully (simulated)',
        emailId: logEntry?.id 
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Email sending error:', error)
    
    // Update log entry as failed if we have a log entry
    if (logEntry?.id) {
      try {
        await supabaseClient
          .from('email_logs')
          .update({ 
            status: 'failed', 
            error_message: error.message,
            updated_at: new Date().toISOString()
          })
          .eq('id', logEntry.id)
      } catch (updateError) {
        console.error('Error updating email log with failure:', updateError)
      }
    }
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to send email',
        details: error.message,
        emailId: logEntry?.id 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
}) 