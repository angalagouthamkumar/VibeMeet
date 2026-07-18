import React, { createContext, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export const AuthContext = createContext();
const client = axios.create({
    baseURL: "http://localhost:3000/api/v1/users"
});

export const AuthProvider = ({ children }) => {
    const [userData, setUserData] = useState(null);
    const router = useNavigate();

    const handleRegister = async (name, username, password) => {
        try {
            const response = await client.post('/register', {
                name,
                username,
                password
            });


            
            if (response.status === 201) {
                return response.data.message;
            }
        } catch (error) {
            throw error;
        }
    };

    const handleLogin = async (username, password) => {
        try {
            const response = await client.post('/login', {
                username,
                password
            });

            
            if (response.status === 200) {
                localStorage.setItem('token', response.data.token);
                router('/home');
            }
        } catch (error) {
            throw error;
        }
    };

    const data = {
        userData,
        setUserData,
        handleRegister,
        handleLogin
    };

    return (
        <AuthContext.Provider value={data}>
            {children}
        </AuthContext.Provider>
    );
};