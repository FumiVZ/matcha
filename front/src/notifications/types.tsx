import type {ToastContentProps} from 'react-toastify';

type CustomNotificationProps = ToastContentProps<{
  title: string;
  content: string;
}>;

export function MessageToast({ closeToast, data }: CustomNotificationProps) {
    return (
        <div style={{
            backgroundColor: '#C5D89D',
            color: '#89986D',
            padding: '0.50rem 1.5rem',
            borderRadius: '8px',
            border: '2px solid #9CAB84',
            fontFamily: 'Helvetica, Arial, sans-serif',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            width: '100%',
            boxSizing: 'border-box'
        }}>
        <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', fontWeight: 'bold', textAlign: 'left', color: '#89986D' }}>{data?.title}</h3>
        <p style={{ margin: '0 0 1rem 0', textAlign: 'left', color: '#89986D' }}>{data?.content}</p>
        <div style={{ marginTop: '1rem', textAlign: 'right' }}>
            <button onClick={closeToast} style={{ 
                marginRight: '0.5rem',
                backgroundColor: '#89986D',
                color: '#F6F0D7',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '4px',
                cursor: 'pointer',
                fontFamily: 'Helvetica, Arial, sans-serif'
            }}>Dismiss</button>
            <button onClick={() => { alert('Action executed!'); closeToast?.(); }} style={{
                backgroundColor: '#9CAB84',
                color: '#2d3a1f',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '4px',
                cursor: 'pointer',
                fontFamily: 'Helvetica, Arial, sans-serif'
            }}>Take Action</button>
        </div>
        </div>
    );
}

export function InfoToast({ data }: CustomNotificationProps) {
    return (
        <div style={{
            backgroundColor: '#F6F0D7',
            color: '#89986D',
            padding: '0.50rem 1.5rem',
            borderRadius: '8px',
            border: '2px solid #C5D89D',
            fontFamily: 'Helvetica, Arial, sans-serif',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            width: '100%',
            boxSizing: 'border-box'
        }}>
        <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', fontWeight: 'bold', textAlign: 'left', color: '#89986D' }}>{data?.title}</h3>
        <p style={{ margin: '0 0 1rem 0', textAlign: 'left', color: '#89986D' }}>{data?.content}</p>
        </div>
    );
}

export function ErrorToast({ closeToast, data }: CustomNotificationProps) {
    return (
        <div style={{
            backgroundColor: '#89986D',
            color: '#F6F0D7',
            padding: '0.50rem 1.5rem',
            borderRadius: '8px',
            border: '2px solid #9CAB84',
            fontFamily: 'Helvetica, Arial, sans-serif',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            width: '100%',
            boxSizing: 'border-box'
        }}>
        <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', fontWeight: 'bold', textAlign: 'left' }}>{data?.title}</h3>
        <p style={{ margin: '0 0 1rem 0', textAlign: 'left' }}>{data?.content}</p>
        <div style={{ marginTop: '1rem', textAlign: 'right' }}>
            <button onClick={closeToast} style={{
                backgroundColor: '#F6F0D7',
                color: '#89986D',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '4px',
                cursor: 'pointer',
                fontFamily: 'Helvetica, Arial, sans-serif'
            }}>Close</button>
        </div>
        </div>
    );
}
