import { useEffect, useState } from 'react';

interface User {
    id: number;
    email: string;
    gender: string;
    sexual_preference: string;
    biography: string;
}

interface DashboardData {
    user: User;
    profilePhoto: string | null;
    tags: string[];
}

export default function Dashboard() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetch('/profile/me')
            .then(res => {
                if (!res.ok) throw new Error('Failed to load profile');
                return res.json();
            })
            .then(data => {
                setData(data);
                setLoading(false);
            })
            .catch(err => {
                setError(err.message);
                setLoading(false);
            });
    }, []);

    if (loading) return <div>Loading...</div>;
    if (error) return <div>Error: {error}</div>;
    if (!data) return <div>No data</div>;

    return (
        <div style={{ padding: '20px' }}>
            <h1>Dashboard</h1>
            <div style={{ border: '1px solid #ccc', padding: '20px', borderRadius: '8px' }}>
                {data.profilePhoto && (
                    <img 
                        src={data.profilePhoto} 
                        alt="Profile" 
                        style={{ width: '150px', height: '150px', objectFit: 'cover', borderRadius: '50%' }}
                    />
                )}
                <h2>Welcome, {data.user.email}</h2>
                <p><strong>Bio:</strong> {data.user.biography}</p>
                <p><strong>Gender:</strong> {data.user.gender}</p>
                <p><strong>Preference:</strong> {data.user.sexual_preference}</p>
                <div>
                    <strong>Tags:</strong>
                    <ul style={{ display: 'flex', gap: '10px', listStyle: 'none', padding: 0 }}>
                        {data.tags.map(tag => (
                            <li key={tag} style={{ background: '#eee', padding: '5px 10px', borderRadius: '15px' }}>
                                {tag}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
}
