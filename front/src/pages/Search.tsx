import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import RangeSlider from 'react-range-slider-input';
import 'react-range-slider-input/dist/style.css';

interface User {
  id: number;
  email: string;
  gender: string;
  sexual_preference: string;
  biography: string;
  age: number;
  score: number;
  profile_photo: string | null;
  tags: string[];
}

const styles = {
  container: {
    padding: '2rem',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  filtersContainer: {
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '12px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    marginBottom: '2rem',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1.5rem',
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.5rem',
  },
  sliderContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  rangeLabels: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.9rem',
    color: '#666',
  },
  slider: {
    flex: 1,
    accentColor: '#007bff',
  },
  button: {
    padding: '0.8rem 1.5rem',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '1rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    alignSelf: 'flex-start',
    transition: 'background-color 0.2s',
  },
  resultsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '2rem',
  },
  userCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    transition: 'transform 0.2s',
  },
  userImage: {
    width: '100%',
    height: '280px',
    objectFit: 'cover' as const,
    backgroundColor: '#eee',
  },
  userInfo: {
    padding: '1.5rem',
  },
  userName: {
    fontSize: '1.4rem',
    marginBottom: '0.5rem',
    color: '#333',
  },
  userStats: {
    display: 'flex',
    gap: '1rem',
    marginBottom: '1rem',
    color: '#666',
    fontSize: '0.9rem',
  },
  tagContainer: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '0.5rem',
  },
  tag: {
    backgroundColor: '#f0f2f5',
    padding: '0.3rem 0.8rem',
    borderRadius: '15px',
    fontSize: '0.8rem',
    color: '#555',
  },
  noResults: {
    textAlign: 'center' as const,
    fontSize: '1.2rem',
    color: '#666',
    marginTop: '3rem',
  }
};

export default function Search() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [availableTags, setAvailableTags] = useState<{id: number, name: string}[]>([]);

  // Search Filters
  const [ageRange, setAgeRange] = useState({ min: 18, max: 100 });
  const [scoreRange, setScoreRange] = useState({ min: 0, max: 1000 });
  const [selectedGender, setSelectedGender] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Fetch tags on component mount
  useEffect(() => {
    fetch('/profile/api/tags')
      .then(res => res.json())
      .then(data => setAvailableTags(data))
      .catch(err => console.error('Error fetching tags:', err));
  }, []);

  const handleTagToggle = (tagName: string) => {
    setSelectedTags(prev => 
      prev.includes(tagName) 
        ? prev.filter(t => t !== tagName)
        : [...prev, tagName]
    );
  };

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const queryParams = new URLSearchParams({
        minAge: ageRange.min.toString(),
        maxAge: ageRange.max === 100 ? '1000' : ageRange.max.toString(),
        minScore: scoreRange.min.toString(),
        maxScore: scoreRange.max === 1000 ? '20000' : scoreRange.max.toString(),
      });

        if (selectedGender) {
            queryParams.append('gender', selectedGender);
        }

        selectedTags.forEach(tag => {
            queryParams.append('tags', tag);
        });

      const response = await fetch(`/search?${queryParams}`);
      if (!response.ok) {
        if (response.status === 401) {
          navigate('/auth');
          return;
        }
        throw new Error('Failed to fetch users');
      }
      
      const data = await response.json();
      setUsers(data);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return (
    <div style={styles.container}>
      <h1>Find Matching Profiles</h1>
      
      <div style={styles.filtersContainer}>
        {/* Age Slider */}
        <div style={styles.filterGroup}>
          <label>Age Range: {ageRange.min} - {ageRange.max === 100 ? '100+' : ageRange.max}</label>
          <div style={{ padding: '0 10px' }}>
            <RangeSlider
              min={18}
              max={100}
              value={[ageRange.min, ageRange.max]}
              onInput={(value: [number, number]) => setAgeRange({ min: value[0], max: value[1] })}
            />
          </div>
        </div>

        {/* Score Slider */}
        <div style={styles.filterGroup}>
          <label>Fame Rating: {scoreRange.min} - {scoreRange.max === 1000 ? '1000+' : scoreRange.max}</label>
          <div style={{ padding: '0 10px' }}>
             <RangeSlider
              min={0}
              max={1000}
              step={10}
              value={[scoreRange.min, scoreRange.max]}
              onInput={(value: [number, number]) => setScoreRange({ min: value[0], max: value[1] })}
            />
          </div>
        </div>

        {/* Gender Filter */}
        <div style={styles.filterGroup}>
            <label>Gender:</label>
            <div style={{ display: 'flex', gap: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center' }}>
                    <input 
                        type="radio" 
                        name="gender" 
                        value="" 
                        checked={selectedGender === ''} 
                        onChange={(e) => setSelectedGender(e.target.value)} 
                        style={{ marginRight: '5px' }}
                    />
                    Any
                </label>
                <label style={{ display: 'flex', alignItems: 'center' }}>
                    <input 
                        type="radio" 
                        name="gender" 
                        value="male" 
                        checked={selectedGender === 'male'} 
                        onChange={(e) => setSelectedGender(e.target.value)}
                        style={{ marginRight: '5px' }}
                    />
                    Male
                </label>
                <label style={{ display: 'flex', alignItems: 'center' }}>
                    <input 
                        type="radio" 
                        name="gender" 
                        value="female" 
                        checked={selectedGender === 'female'} 
                        onChange={(e) => setSelectedGender(e.target.value)}
                        style={{ marginRight: '5px' }}
                    />
                    Female
                </label>
            </div>
        </div>

        {/* Tags Filter */}
        <div style={styles.filterGroup}>
            <label>Interests:</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', maxHeight: '150px', overflowY: 'auto', border: '1px solid #eee', padding: '0.5rem', borderRadius: '4px' }}>
                {availableTags.map(tag => (
                    <div 
                        key={tag.id}
                        onClick={() => handleTagToggle(tag.name)}
                        style={{
                            padding: '0.3rem 0.8rem',
                            borderRadius: '15px',
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            backgroundColor: selectedTags.includes(tag.name) ? '#007bff' : '#f0f2f5',
                            color: selectedTags.includes(tag.name) ? 'white' : '#555',
                            border: '1px solid #ddd',
                            userSelect: 'none'
                        }}
                    >
                        #{tag.name}
                    </div>
                ))}
            </div>
        </div>

        <button style={styles.button} onClick={fetchUsers} disabled={loading}>
          {loading ? 'Searching...' : 'Apply Filters'}
        </button>
      </div>

      {error && <div style={{color: 'red', marginBottom: '1rem'}}>{error}</div>}

      {users.length === 0 && !loading ? (
        <div style={styles.noResults}>No profiles found matching your criteria.</div>
      ) : (
        <div style={styles.resultsGrid}>
          {users.map(user => (
            <div key={user.id} style={styles.userCard}>
              <img 
                src={user.profile_photo ? `/uploads/photos/${user.profile_photo}` : 'https://placehold.co/400x400?text=No+Image'} 
                alt="Profile" 
                style={styles.userImage}
              />
              <div style={styles.userInfo}>
                <div style={styles.userName}>{user.email} (Age: {user.age})</div>
                <div style={styles.userStats}>
                  <span>⭐ {user.score} points</span>
                  <span>{user.gender === 'male' ? '♂️' : '♀️'} {user.gender}</span>
                </div>
                <div style={styles.tagContainer}>
                  {user.tags && user.tags.map(tag => (
                    <span key={tag} style={styles.tag}>#{tag}</span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
