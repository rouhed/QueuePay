const { Pool } = require('pg');
require('dotenv').config({ path: '../.env' });

const pool = new Pool({
  connectionString: 'postgresql://postgres:admin123@127.0.0.1:5432/queuepay',
});

async function main() {
  try {
    const id = 1; // Assuming entity 1
    const commission = '100.00';
    console.log('Running query with string commission...');
    const statsRes = await pool.query(
      `SELECT 
        COUNT(id) as total_tickets,
        COALESCE(SUM(price), 0) as total_revenue,
        COUNT(id) * $2 as commission_earned
       FROM bookings
       WHERE entity_id = $1 AND status != 'CANCELLED'`,
      [id, commission]
    );
    console.log('Success:', statsRes.rows);
  } catch (err) {
    console.error('Error occurred:', err.message);
    console.error(err);
  } finally {
    await pool.end();
  }
}

main();
