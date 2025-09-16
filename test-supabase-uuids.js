const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://vqjvdkopnmhqagwgzwkf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxanZka29wbm1ocWFnd2d6d2tmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNjQ4OTE2MSwiZXhwIjoyMDQyMDY1MTYxfQ.FyNJANGkZFT_7v7gPWrFYfNWVZqM0CqQMrq7YLVzm-0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSupabaseUUIDs() {
  console.log('🔍 Checking Supabase mst_companies table structure...');
  
  try {
    // Get all companies to see the actual UUID format
    const { data: companies, error: companiesError } = await supabase
      .from('mst_companies')
      .select('*')
      .limit(5);

    if (companiesError) {
      console.error('❌ Companies Error:', companiesError.message);
      return;
    }

    if (companies && companies.length > 0) {
      console.log('✅ Found companies:');
      companies.forEach((company, index) => {
        console.log(`${index + 1}. ID: ${company.id}, Name: ${company.name}`);
      });
      
      console.log('\n📋 First company details:');
      console.log(JSON.stringify(companies[0], null, 2));
    } else {
      console.log('⚠️ No companies found');
    }

    // Also check divisions table
    console.log('\n🔍 Checking divisions table...');
    const { data: divisions, error: divisionsError } = await supabase
      .from('divisions')
      .select('*')
      .limit(5);

    if (divisionsError) {
      console.error('❌ Divisions Error:', divisionsError.message);
      return;
    }

    if (divisions && divisions.length > 0) {
      console.log('✅ Found divisions:');
      divisions.forEach((division, index) => {
        console.log(`${index + 1}. ID: ${division.id}, Company ID: ${division.company_id}, Tally URL: ${division.tally_url}`);
      });
      
      console.log('\n📋 First division details:');
      console.log(JSON.stringify(divisions[0], null, 2));
      
      // Test with the first division's actual UUIDs
      const firstDivision = divisions[0];
      console.log(`\n🧪 Testing with actual UUIDs: companyId=${firstDivision.company_id}, divisionId=${firstDivision.id}`);
      
      const { data: testData, error: testError } = await supabase
        .from('divisions')
        .select('tally_url')
        .eq('company_id', firstDivision.company_id)
        .eq('id', firstDivision.id)
        .single();
        
      if (testError) {
        console.error('❌ Test query error:', testError.message);
      } else {
        console.log('✅ Test query success! Tally URL:', testData.tally_url);
      }
      
    } else {
      console.log('⚠️ No divisions found');
    }
    
  } catch (error) {
    console.error('❌ Exception:', error.message);
  }
}

testSupabaseUUIDs();
