import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function useRedirectIfNotAuthenticated() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const isAuthenticated = localStorage.getItem('isAuthenticated');

        if (!isAuthenticated) {
            navigate('/auth');
        }
        setLoading(false);
    }, [navigate]);

    return { loading };
}
