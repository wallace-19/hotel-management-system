require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.pbkdf2Sync(password, salt, 310000, 32, 'sha256').toString('hex');
  return `${salt}$${hash}`;
}

(async () => {
  try {
    const oldEmail = 'staff@example.com';
    const email = 'wally@example.com';
    const password = '#Wally123';
    const full_name = 'Wally';
    const phone = '#';
    const role = 'staff';

    const password_hash = hashPassword(password);

    const { data: existingByOldEmail } = await supabase
      .from('staff')
      .select('id')
      .eq('email', oldEmail)
      .single();

    if (existingByOldEmail && existingByOldEmail.id) {
      const { error: updateError } = await supabase
        .from('staff')
        .update({ email, full_name, phone, role, password_hash })
        .eq('id', existingByOldEmail.id);

      if (updateError) {
        console.error('Update error:', updateError.message || updateError);
        process.exit(1);
      }

      console.log(`Updated existing staff account from ${oldEmail} to ${email}`);
      console.log('Use these credentials to sign in:');
      console.log('  Email :', email);
      console.log('  Password :', password);
      process.exit(0);
    }

    const { data: existingByNewEmail } = await supabase
      .from('staff')
      .select('id')
      .eq('email', email)
      .single();

    if (existingByNewEmail && existingByNewEmail.id) {
      const { error: updateError } = await supabase
        .from('staff')
        .update({ full_name, phone, role, password_hash })
        .eq('id', existingByNewEmail.id);

      if (updateError) {
        console.error('Update error:', updateError.message || updateError);
        process.exit(1);
      }

      console.log(`Updated password for existing staff account ${email}`);
      console.log('Use these credentials to sign in:');
      console.log('  Email :', email);
      console.log('  Password :', password);
      process.exit(0);
    }

    const { data, error } = await supabase
      .from('staff')
      .insert([{ full_name, email, role, phone, password_hash }])
      .select('*')
      .single();

    if (error) {
      console.error('Insert error:', error.message || error);
      process.exit(1);
    }

    console.log('Inserted staff:', data);
    console.log('Use these credentials to sign in:');
    console.log('  Email :', email);
    console.log('  Password :', password);
  } catch (e) {
    console.error('Unexpected error:', e);
    process.exit(1);
  }
})();
