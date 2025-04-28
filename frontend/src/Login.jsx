import React, { useState } from 'react';
import { useAuth } from './context/AuthContext'; 

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


    return (
        <form onSubmit={handleLogin}>
            <h2>Login</h2>
            <label htmlFor="username">Username:</label>
            <input type="text" name="username" id="username" value={username} onChange={(e) => setUsername(e.target.value)} disabled={loading} required/>
            <br />
            <label htmlFor="password">Password:</label>
            <input type="password" name="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading} required/>
            <br />
            <button type="submit" disabled={loading}>{loading ? 'Logging in...' : 'Login'}</button>
            {error && <p style={{ color: 'red' }}>{error}</p>}
        </form>
    )
}

export default LoginForm