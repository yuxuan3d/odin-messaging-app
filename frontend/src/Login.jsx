import React, { useState } from 'react';
import { useAuth } from './context/AuthContext'; 
import api from './services/api';

function LoginForm() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const [error, setError] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            await login(username, password);
            setUsername('');
            setPassword('');
        } catch (error) {
            console.error("Login failed:", error);
            setError(error.message || 'Login failed. Check credentials');
        } finally {
            setLoading(false);
        }
    }

    const handleRegister = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await api.post('/register', { username, password });
            setUsername('');
            setPassword('');
            setError('Registration successful! You can now log in.');
        } catch (error) {
            console.error("Register failed:", error);
            setError(error.message || 'Register failed. Check credentials');
        } finally {
            setLoading(false);
        }
    }


    return (
        <div className='login-container'>
            <form className='login-form'>
                <h2>Login</h2>
                <div className='login-form-fields'>
                    <label htmlFor="username">Username: </label>
                    <input type="text" name="username" id="username" value={username} onChange={(e) => setUsername(e.target.value)} disabled={loading} required/>
                </div>
                
                <div className='login-form-fields'> 
                <label htmlFor="password">Password: </label>
                <input type="password" name="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading} required/>
                </div>
                <div className='button-container'>
                    <button type="submit" disabled={loading} onClick={handleLogin}>{loading ? 'Logging in...' : 'Login'}</button>
                    <button type="submit" disabled={loading} onClick={handleRegister}>{loading ? 'Registering...' : 'Register'}</button>
                </div>
                
                {error && <p style={{ color: 'red' }}>{error}</p>}
            </form>
        </div>
    )
}

export default LoginForm