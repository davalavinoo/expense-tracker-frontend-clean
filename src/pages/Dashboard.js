import { useEffect, useState } from 'react';
import axios from 'axios';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { useNavigate } from 'react-router-dom';

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

function Dashboard() {
  const [expenses, setExpenses] = useState([]);
  const [type, setType] = useState('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [recurring, setRecurring] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/api/expenses', {
        headers: { 'x-auth-token': token },
      });
      setExpenses(res.data);
      detectRecurring(res.data);
    } catch (err) {
      console.error(err.response.data);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const newExpense = { type, amount: parseFloat(amount), category, date, description };
      await axios.post('https://expense-tracker-backend-pzfc.onrender.com', newExpense, {
        headers: { 'x-auth-token': token },
      });
      setType('expense');
      setAmount('');
      setCategory('');
      setDate('');
      setDescription('');
      fetchExpenses();
    } catch (err) {
      console.error(err.response.data);
    }
  };

  const detectRecurring = (data) => {
    const expenseMap = {};
    data.filter(exp => exp.type === 'expense').forEach(exp => {
      const key = `${exp.amount}-${exp.category}`;
      if (expenseMap[key]) {
        expenseMap[key].count++;
        expenseMap[key].dates.push(exp.date);
      } else {
        expenseMap[key] = { ...exp, count: 1, dates: [exp.date] };
      }
    });
    const recurringItems = Object.values(expenseMap).filter(item => item.count >= 2);
    setRecurring(recurringItems);
  };

  const startVoiceInput = () => {
    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript.toLowerCase();
      const parts = transcript.split(' ');
      if (parts.length >= 3) {
        setType(parts[0] === 'income' ? 'income' : 'expense');
        setAmount(parts[1]);
        setCategory(parts[2]);
        setDate(new Date().toISOString().split('T')[0]);
        setDescription(parts.slice(3).join(' ') || '');
      }
    };
    recognition.onerror = (event) => console.error('Voice error:', event.error);
    recognition.start();
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  // Chart Data
  const chartData = {
    labels: [...new Set(expenses.filter(exp => exp.type === 'expense').map(exp => exp.category))],
    datasets: [{
      label: 'Expenses by Category (₹)',
      data: [...new Set(expenses.filter(exp => exp.type === 'expense').map(exp => exp.category))].map(cat =>
        expenses.filter(exp => exp.type === 'expense' && exp.category === cat).reduce((sum, exp) => sum + exp.amount, 0)
      ),
      backgroundColor: 'rgba(75, 192, 192, 0.6)',
      borderColor: 'rgba(75, 192, 192, 1)',
      borderWidth: 1,
    }],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      title: { display: true, text: 'Expense Trends' },
    },
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
          <button onClick={handleLogout} className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">Logout</button>
        </div>

        {/* Expense Form */}
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-xl mb-4 text-center font-semibold">Add Entry</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <select value={type} onChange={(e) => setType(e.target.value)} className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
            <input
              type="number"
              placeholder="Amount (₹)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              step="0.01"
              required
            />
            <input
              type="text"
              placeholder="Category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <input
              type="text"
              placeholder="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 md:col-span-2"
            />
          </div>
          <div className="flex gap-4 mt-4">
            <button type="submit" className="flex-1 p-2 bg-blue-500 text-white rounded hover:bg-blue-600">Add</button>
            <button type="button" onClick={startVoiceInput} className="flex-1 p-2 bg-green-500 text-white rounded hover:bg-green-600">Voice Input</button>
          </div>
        </form>

        {/* Chart */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <Bar data={chartData} options={chartOptions} />
        </div>

        {/* Recurring Expenses */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-xl mb-4 text-center font-semibold">Recurring Expenses</h2>
          {recurring.length > 0 ? (
            <ul>
              {recurring.map((item, index) => (
                <li key={index} className="p-2 border-b text-gray-700">
                  ₹{item.amount} - {item.category} (Seen {item.count} times)
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-center text-gray-500">No recurring expenses detected yet.</p>
          )}
        </div>

        {/* Expense List */}
        <ul className="space-y-4">
          {expenses.map(exp => (
            <li key={exp._id} className="bg-white p-4 rounded-lg shadow-md flex justify-between items-center">
              <span>{exp.type}: ₹{exp.amount} - {exp.category} on {new Date(exp.date).toLocaleDateString()} ({exp.description || 'No description'})</span>
              <span className={`text-sm ${exp.type === 'income' ? 'text-green-500' : 'text-red-500'}`}>
                {exp.type === 'income' ? '+' : '-'}₹{exp.amount}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default Dashboard;
