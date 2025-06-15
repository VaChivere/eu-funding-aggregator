// src/app/api/cron/route.ts

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Define a type for the notice object to avoid using 'any'
type TedNotice = {
  id: string;
  title: { EN: string };
  content: { EN: string };
  publicationDate: string;
  seller: { name: string };
};

// This is the main function that will be run by the cron job
export async function GET() {
  // Create a Supabase client with SERVICE_ROLE access
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const formattedDate = yesterday.toISOString().split('T')[0].replace(/-/g, '');
    
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

    if (!data.results || data.results.length === 0) {
      return NextResponse.json({ message: 'No new tenders found.' });
    }

    // Use our new TedNotice type here
    const opportunities = data.results.map((notice: TedNotice) => ({
      source_id: notice.id,
      source_api: 'ted',
      title: notice.title.EN,
      description: notice.content.EN,
      publication_date: notice.publicationDate,
      country: 'NL',
      issuer_name: notice.seller.name,
    }));
    
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