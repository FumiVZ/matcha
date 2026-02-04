import { useEffect, useState } from 'react';
import { useRedirectIfNotAuthenticated } from '../hooks/useRedirectIfNotAuthenticated';


const styles = {
  container: {
    fontFamily: 'Arial, sans-serif',
    maxWidth: '800px',
    margin: '2rem auto',
    padding: '1rem',
    backgroundColor: '#f5f5f5',
  },
  card: {
    background: 'white',
    padding: '2rem',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  formSection: {
    marginBottom: '2rem',
    paddingBottom: '1.5rem',
    borderBottom: '1px solid #eee',
  },
  radioGroup: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '1rem',
  },
  radioLabel: {
    display: 'flex',
    alignItems: 'center',
    padding: '0.7rem 1.2rem',
    backgroundColor: '#f0f0f0',
    borderRadius: '5px',
    cursor: 'pointer',
  },
  textarea: {
    width: '100%',
    minHeight: '120px',
    padding: '1rem',
    border: '1px solid #ddd',
    borderRadius: '5px',
    fontFamily: 'inherit',
    fontSize: '1rem',
    resize: 'vertical' as const,
  },
  tagsContainer: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '0.8rem',
  },
  tagLabel: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '0.5rem 1rem',
    backgroundColor: '#f0f0f0',
    borderRadius: '20px',
    cursor: 'pointer',
    fontSize: '0.9rem',
  },
  submitButton: {
    padding: '1rem 2rem',
    fontSize: '1.1rem',
    backgroundColor: '#4CAF50',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    width: '100%',
  }
};

interface Tag {
  id: number;
  name: string;
}

export default function ProfileSetup() {
  const { loading: authLoading } = useRedirectIfNotAuthenticated();
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<Set<number>>(new Set());

  if (authLoading) return null;

  useEffect(() => {
    fetch('/profile/api/tags')
      .then(res => res.json())
      .then(data => setTags(data))
      .catch(err => console.error('Error fetching tags:', err));
  }, []);

  const handleTagChange = (tagId: number) => {
    const newSelected = new Set(selectedTags);
    if (newSelected.has(tagId)) {
      newSelected.delete(tagId);
    } else {
      newSelected.add(tagId);
    }
    setSelectedTags(newSelected);
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1>Complete Your Profile</h1>
        <p style={{ color: '#666', marginBottom: '2rem' }}>Tell us more about yourself to find better matches</p>

        <form action="/profile/setup" method="POST" encType="multipart/form-data">
          
          <div style={styles.formSection}>
            <h2>I am...</h2>
            <div style={styles.radioGroup}>
              <label style={styles.radioLabel}>
                <input type="radio" name="gender" value="male" required /> 
                <span style={{ marginLeft: '0.5rem' }}>Man</span>
              </label>
              <label style={styles.radioLabel}>
                <input type="radio" name="gender" value="female" /> 
                <span style={{ marginLeft: '0.5rem' }}>Woman</span>
              </label>
              <label style={styles.radioLabel}>
                <input type="radio" name="gender" value="other" /> 
                <span style={{ marginLeft: '0.5rem' }}>Other</span>
              </label>
            </div>
          </div>

          <div style={styles.formSection}>
            <h2>Looking for...</h2>
            <div style={styles.radioGroup}>
              <label style={styles.radioLabel}>
                <input type="radio" name="sexual_preference" value="male" required /> 
                <span style={{ marginLeft: '0.5rem' }}>Men</span>
              </label>
              <label style={styles.radioLabel}>
                <input type="radio" name="sexual_preference" value="female" /> 
                <span style={{ marginLeft: '0.5rem' }}>Women</span>
              </label>
              <label style={styles.radioLabel}>
                <input type="radio" name="sexual_preference" value="both" /> 
                <span style={{ marginLeft: '0.5rem' }}>Both</span>
              </label>
            </div>
          </div>

          <div style={styles.formSection}>
            <h2>Biography</h2>
            <textarea name="biography" placeholder="Write something about yourself..." required style={styles.textarea}></textarea>
          </div>

          <div style={styles.formSection}>
            <h2>Interests</h2>
            <div style={styles.tagsContainer}>
              {tags.map(tag => (
                <label 
                  key={tag.id} 
                  style={{
                    ...styles.tagLabel,
                    backgroundColor: selectedTags.has(tag.id) ? '#4CAF50' : '#f0f0f0',
                    color: selectedTags.has(tag.id) ? 'white' : 'black'
                  }}
                >
                  <input 
                    type="checkbox" 
                    name="tags" 
                    value={tag.id} 
                    onChange={() => handleTagChange(tag.id)}
                    style={{ display: 'none' }}
                  />
                  <span>#{tag.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div style={styles.formSection}>
            <h2>Photos</h2>
            <p>Upload up to 5 photos. Select the radio button to choose your profile picture.</p>
            {/* Simple file input implementation for now */}
            {[0, 1, 2, 3, 4].map(i => (
              <div key={i} style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <input type="file" name="photos" accept=".jpg,.jpeg,.png" />
                <label>
                  <input type="radio" name="profile_photo_index" value={i} defaultChecked={i === 0} />
                  Profile Pic
                </label>
              </div>
            ))}
          </div>

          <div style={styles.formSection}>
            <h2>My Birthday</h2>
            <input 
              type="date" 
              name="birthdate" 
              required 
              style={{
                width: '100%',
                padding: '0.8rem',
                border: '1px solid #ddd',
                borderRadius: '5px',
                fontSize: '1rem',
                marginBottom: '1rem'
              }}
            />
          </div>

          <button type="submit" style={styles.submitButton}>Save Profile</button>
        </form>
      </div>
    </div>
  );
}
