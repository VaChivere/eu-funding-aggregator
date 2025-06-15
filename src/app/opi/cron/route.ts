// src/app/api/cron/route.ts

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// This is the main function that will be run by the cron job
export async function GET() {
  // Create a Supabase client with SERVICE_ROLE access
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! // Use the secret service role key
  );

  try {
    // We'll fetch tenders published in the last day from the Netherlands (NL)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const formattedDate = yesterday.toISOString().split('T')[0].replace(/-/g, '');
    
    // Construct the TED API URL
    // This query searches for notices published yesterday in the Netherlands
    const tedApiUrl = `https://ted.europa.eu/api/v3.0/notices/search?q=PD%3D%5B${formattedDate}%5D%20AND%20CY%3D%5BNL%5D&scope=3`;

    console.log(`Fetching data from: ${tedApiUrl}`);
    const response = await fetch(tedApiUrl, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch from TED API: ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`Found ${data.total} new tenders.`);

    if (data.total === 0) {
      return NextResponse.json({ message: 'No new tenders found.' });
    }

    // "Transform" the data to fit our database schema
    const opportunities = data.results.map((notice: any) => ({
      source_id: notice.id,
      source_api: 'ted',
      title: notice.title.EN, // Assuming English title
      description: notice.content.EN, // Assuming English content
      publication_date: notice.publicationDate,
      country: 'NL', // We filtered by NL
      issuer_name: notice.seller.name,
    }));

    // "Load" the data into our Supabase table
    // upsert will insert new rows or update existing ones if the source_id matches
    const { error } = await supabase.from('opportunities').upsert(opportunities, {
      onConflict: 'source_id',
    });

    if (error) {
      throw error;
    }

    return NextResponse.json({ message: `Successfully added/updated ${opportunities.length} opportunities.` });
  } catch (error) {
    console.error(error);
    if (error instanceof Error) {
        return new NextResponse(error.message, { status: 500 });
    }
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}