import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/common.css';
import { NotificationMenu } from '../notifications/NotificationMenu';
import { useRedirectIfNotAuthenticated } from '../hooks/useRedirectIfNotAuthenticated';


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
    const navigate = useNavigate();
    const { loading: authLoading } = useRedirectIfNotAuthenticated();
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    if (authLoading) return null;

    useEffect(() => {
        fetch('/profile/me')
            .then(res => {
                if (res.status === 401 || res.status === 403) {
                    localStorage.removeItem('isAuthenticated');
                    navigate('/auth');
                    throw new Error('Unauthorized');
                }
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

    if (loading) return <div className="loading">Loading...</div>;
    if (error) return <div className="error">Error: {error}</div>;
    if (!data) return <div className="error">No data</div>;

    return (
        <div className="dashboard-container">
            <header className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h1>Dashboard</h1>
                <NotificationMenu />
            </header>
            <div className="profile-card">
                {data.profilePhoto && (
                    <img 
                        src={data.profilePhoto} 
                        alt="Profile" 
                        className="profile-photo"
                    />
                )}
                <h2>Welcome, {data.user.email}</h2>
                <div className="profile-info">
                    <p><strong>Bio:</strong> {data.user.biography}</p>
                    <p><strong>Gender:</strong> {data.user.gender}</p>
                    <p><strong>Preference:</strong> {data.user.sexual_preference}</p>
                </div>
                <div>
                    <strong>Tags:</strong>
                    <ul className="tags-list">
                        {data.tags.map(tag => (
                            <li key={tag} className="tag-item">
                                {tag}
                            </li>
                        ))}
                    </ul>
                </div>
                <button 
                    onClick={() => navigate('/search')}
                    style={{
                        marginTop: '20px',
                        padding: '10px 20px',
                        backgroundColor: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        fontSize: '16px'
                    }}
                >
                    Start Matching
                </button>
                <button
                    onClick={() => navigate('/recommended')}
                    style={{
                        marginTop: '20px',
                        padding: '10px 20px',
                        backgroundColor: '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        fontSize: '16px'
                    }}
                >
                    View Recommendations
                </button>
                <button
                onClick={() => navigate('/chat')}
                style={{
                    marginTop: '20px',
                    padding: '10px 20px',
                    backgroundColor: '#17a2b8',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    fontSize: '16px'
                }}
                >
                    start chatting
                </button>
            </div>
        </div>
    );
}
