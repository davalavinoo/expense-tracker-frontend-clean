import { useEffect, useState } from 'react';
import axios from 'axios';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { useNavigate } from 'react-router-dom';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

function Dashboard() {
  const [expenses, setExpenses] = useState([]);
  const [type, setType] = useState('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [recurring, setRecurring] = useState([]);
  const [editId, setEditId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchExpenses = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) { navigate('/login'); return; }
        const res = await axios.get('https://expense-tracker-backend-pzfc.onrender.com/api/expenses', {
          headers: { 'x-auth-token': token },
        });
        setExpenses(res.data);
        detectRecurring(res.data);
      } catch (err) {
        console.error('Fetch Error:', err.response ? err.response.data : err.message);
      }
    };
    fetchExpenses();
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      if (!token) { navigate('/login'); return; }
      const newExpense = { type, amount: parseFloat(amount), category, date, description };
      if (editId) {
        await axios.put(`https://expense-tracker-backend-pzfc.onrender.com/api/expenses/${editId}`, newExpense, {
          headers: { 'x-auth-token': token },
        });
        setEditId(null);
      } else {
        await axios.post('https://expense-tracker-backend-pzfc.onrender.com/api/expenses', newExpense, {
          headers: { 'x-auth-token': token },
        });
      }
      setType('expense');
      setAmount('');
      setCategory('');
      setDate('');
      setDescription('');
      const fetchRes = await axios.get('https://expense-tracker-backend-pzfc.onrender.com/api/expenses', {
        headers: { 'x-auth-token': token },
      });
      setExpenses(fetchRes.data);
      detectRecurring(fetchRes.data);
    } catch (err) {
      console.error('Submit Error:', err.response ? err.response.data : err.message);
    }
  };

  const handleEdit = (exp) => {
    setEditId(exp._id);
    setType(exp.type);
    setAmount(exp.amount.toString());
    setCategory(exp.category);
    setDate(exp.date.split('T')[0]);
    setDescription(exp.description || '');
  };

  const handleDelete = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`https://expense-tracker-backend-pzfc.onrender.com/api/expenses/${id}`, {
        headers: { 'x-auth-token': token },
      });
      const fetchRes = await axios.get('https://expense-tracker-backend-pzfc.onrender.com/api/expenses', {
        headers: { 'x-auth-token': token },
      });
      setExpenses(fetchRes.data);
      detectRecurring(fetchRes.data);
    } catch (err) {
      console.error('Delete Error:', err.response ? err.response.data : err.message);
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
    setRecurring(Object.values(expenseMap).filter(item => item.count >= 2));
  };

  const startVoiceInput = () => {
    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.onresult = async (event) => {
      const transcript = event.results[0][0].transcript.toLowerCase();
      console.log('Voice Input:', transcript);
      const parts = transcript.split(' ');
      let type = 'expense';
      let amount = '';
      let category = '';
      let description = '';
      if (parts.includes('income')) {
        type = 'income';
        parts.splice(parts.indexOf('income'), 1);
      } else if (parts.includes('expense')) {
        parts.splice(parts.indexOf('expense'), 1);
      }
      const amountIndex = parts.findIndex(part => !isNaN(parseFloat(part)));
      if (amountIndex !== -1) {
        amount = parts[amountIndex];
        parts.splice(amountIndex, 1);
      }
      if (parts.length > 0) {
        category = parts[0];
        description = parts.slice(1).join(' ');
      }
      if (amount && category) {
        const token = localStorage.getItem('token');
        const newExpense = { type, amount: parseFloat(amount), category, date: new Date().toISOString().split('T')[0], description };
        try {
          const res = await axios.post('https://expense-tracker-backend-pzfc.onrender.com/api/expenses', newExpense, {
            headers: { 'x-auth-token': token },
          });
          console.log('Voice Submit:', res.data);
          const fetchRes = await axios.get('https://expense-tracker-backend-pzfc.onrender.com/api/expenses', {
            headers: { 'x-auth-token': token },
          });
          setExpenses(fetchRes.data);
          detectRecurring(fetchRes.data);
        } catch (err) {
          console.error('Voice Error:', err.response ? err.response.data : err.message);
        }
      }
    };
    recognition.onerror = (event) => console.error('Voice error:', event.error);
    recognition.start();
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

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
    plugins: { legend: { position: 'top' }, title: { display: true, text: 'Expense Trends' } },
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
          <button onClick={handleLogout} className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">Logout</button>
        </div>
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-xl mb-4 text-center font-semibold">{editId ? 'Edit Entry' : 'Add Entry'}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <select value={type} onChange={(e) => setType(e.target.value)} className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
            <input type="number" placeholder="Amount (₹)" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500" step="0.01" required />
            <input type="text" placeholder="Category" value={category} onChange={(e) => setCategory(e.target.value)} className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500" required />
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500" required />
            <input type="text" placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 md:col-span-2" />
          </div>
          <div className="flex gap-4 mt-4">
            <button type="submit" className="flex-1 p-2 bg-blue-500 text-white rounded hover:bg-blue-600">{editId ? 'Update' : 'Add'}</button>
            <button type="button" onClick={startVoiceInput} className="flex-1 p-2 bg-green-500 text-white rounded hover:bg-green-600">Voice Input</button>
          </div>
        </form>
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <Bar data={chartData} options={chartOptions} />
        </div>
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
        <ul className="space-y-4">
          {expenses.map(exp => (
            <li key={exp._id} className="bg-white p-4 rounded-lg shadow-md flex justify-between items-center">
              <span>{exp.type}: ₹{exp.amount} - {exp.category} on {new Date(exp.date).toLocaleDateString()} ({exp.description || 'No description'})</span>
              <div className="flex gap-2">
                <button onClick={() => handleEdit(exp)} className="px-2 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600">Edit</button>
                <button onClick={() => handleDelete(exp._id)} className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600">Delete</button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default Dashboard;
