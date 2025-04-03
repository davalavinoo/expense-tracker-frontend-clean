import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './Login.css'; // Update CSS too

const Login = () => {
  const [isLogin, setIsLogin] = useState(true); // Toggle between login/signup
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState(''); // For signup
  const navigate = useNavigate();

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = isLogin
        ? 'http://localhost:5000/api/auth/login' // Swap to live URL later
        : 'http://localhost:5000/api/auth/signup';
      const data = isLogin ? { email, password } : { name, email, password };
      const res = await axios.post(url, data);
      console.log(`${isLogin ? 'Login' : 'Signup'} Response:`, res.data);
      localStorage.setItem('token', res.data.token);
      navigate('/dashboard');
    } catch (err) {
      console.error(`${isLogin ? 'Login' : 'Signup'} Error:`, err.response ? err.response.data : err.message);
    }
  };

  return (
    <div className="login-container">
      <h2>{isLogin ? 'Login' : 'Sign Up'}</h2>
      <div className="toggle-buttons">
        <button onClick={() => setIsLogin(true)} className={isLogin ? 'active' : ''}>Login</button>
        <button onClick={() => setIsLogin(false)} className={!isLogin ? 'active' : ''}>Sign Up</button>
      </div>
      <form onSubmit={onSubmit}>
        {!isLogin && (
          <div>
            <label>Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required={!isLogin}
            />
          </div>
        )}
        <div>
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit">{isLogin ? 'Login' : 'Sign Up'}</button>
      </form>
    </div>
  );
};

export default Login;
