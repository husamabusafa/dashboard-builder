import { useEffect } from 'react';
import './styles/App.css'
import DashboardBuilder from './components/DashboardBuilder';
import { queryDatabase } from './utils/queryDatabase';

function App() {
    console.log('App');
  useEffect(() => {
    // Example 1: Fetch data from the NestJS server
    fetch('http://localhost:2100/data')
      .then(response => response.json())
      .then(data => {
        console.log('Data from PostgreSQL:', data);
      })
      .catch(error => {
        console.error('Error fetching data:', error);
      });

    // Example 2: Execute custom query using queryDatabase function
    const runCustomQuery = async () => {
      try {
        // Example query: Get all tables in the database
        const tablesResult = await queryDatabase(`
          SELECT table_name, table_schema 
          FROM information_schema.tables 
          WHERE table_schema = 'public'
        `);
        console.log('Custom Query - Tables:', tablesResult);

        // Example query: Count rows if you have a specific table
        // Uncomment and replace 'your_table_name' with an actual table name
        /*
        const countResult = await queryDatabase(`
          SELECT COUNT(*) as total FROM your_table_name
        `);
        console.log('Custom Query - Count:', countResult);
        */
      } catch (error) {
        console.error('Custom query error:', error);
      }
    };

    runCustomQuery();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw' }}>
      <DashboardBuilder/>
    </div>
  )
}

export default App
