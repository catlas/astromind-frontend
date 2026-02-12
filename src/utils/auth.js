import axios from 'axios';

export const getApiBaseUrl = () => {
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  return import.meta.env.VITE_API_URL || (isLocalhost ? 'http://localhost:8000' : 'https://astromind-api.onrender.com');
};

export const clearSessionAndRedirect = (navigate) => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  navigate('/');
};

export const verifySession = async (navigate) => {
  const token = localStorage.getItem('token');
  const userData = localStorage.getItem('user');

  if (!token || !userData) {
    clearSessionAndRedirect(navigate);
    return null;
  }

  try {
    const apiBaseUrl = getApiBaseUrl();
    const response = await axios.get(`${apiBaseUrl}/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      timeout: 15000,
    });

    localStorage.setItem('user', JSON.stringify(response.data));
    return response.data;
  } catch (error) {
    if (error?.response?.status === 401 || error?.response?.status === 403) {
      clearSessionAndRedirect(navigate);
      return null;
    }

    // При временна мрежова грешка не изхвърляме потребителя.
    return JSON.parse(userData);
  }
};
