import { getCases } from '@/actions/cases';
import { deleteCase, createBasicCase } from '@/actions/admin';
import Link from 'next/link';

export default async function AdminPage() {
  const cases = await getCases();

  const inputStyle = {
    width: '100%',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-sm)',
    padding: '0.5rem 0.75rem',
    fontSize: '0.875rem',
    color: 'var(--text-primary)',
    outline: 'none',
    marginBottom: '1rem'
  };

  const labelStyle = {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: 500,
    marginBottom: '0.25rem',
    color: 'var(--text-secondary)'
  };

  return (
    <div className="flex-col gap-8" style={{ display: 'flex', animation: 'fadeIn 0.5s ease-in-out' }}>
      <div className="flex-col gap-2" style={{ display: 'flex' }}>
        <h1 style={{ fontSize: '2.25rem', fontWeight: 700 }}>Admin Panel</h1>
        <p className="text-muted" style={{ maxWidth: '42rem' }}>
          Manage the database curations, add new cases, and handle taxonomy mapping.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
        
        {/* ADD CASE FORM */}
        <div className="glass-panel" style={{ alignSelf: 'flex-start' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>Add Basic Case</h2>
          <form action={createBasicCase}>
            <div>
              <label style={labelStyle}>Case Name</label>
              <input name="caseName" required style={inputStyle} placeholder="e.g. Doe v. AI Corp" />
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={labelStyle}>Jurisdiction</label>
                <input name="jurisdiction" required style={inputStyle} placeholder="State/Federal" />
              </div>
              <div>
                <label style={labelStyle}>Country</label>
                <input name="country" required style={inputStyle} placeholder="USA" />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Court Name</label>
              <input name="courtName" required style={inputStyle} placeholder="District Court of..." />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={labelStyle}>Status</label>
                <select name="statusPublic" style={inputStyle}>
                  <option value="Active" style={{ color: '#000' }}>Active</option>
                  <option value="Closed" style={{ color: '#000' }}>Closed</option>
                  <option value="Settled" style={{ color: '#000' }}>Settled</option>
                  <option value="Dismissed" style={{ color: '#000' }}>Dismissed</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Materiality</label>
                <select name="materialityScore" style={inputStyle}>
                  <option value="High" style={{ color: '#000' }}>High</option>
                  <option value="Medium" style={{ color: '#000' }}>Medium</option>
                  <option value="Low" style={{ color: '#000' }}>Low</option>
                </select>
              </div>
            </div>

            <div>
              <label style={labelStyle}>Short Summary</label>
              <textarea name="summaryShort" required rows={3} style={{ ...inputStyle, resize: 'none' }} placeholder="Brief description of the suit..." />
            </div>

            <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>
              Create Case Entry
            </button>
          </form>
        </div>

        {/* LIST CASES */}
        <div className="glass-panel" style={{ gridColumn: 'span 2' }}>
           <h2 style={{ fontSize: '1.25rem', fontWeight: 600, borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>Manage Database</h2>
           <div style={{ overflowX: 'auto' }}>
             <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
               <thead style={{ background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: '0.75rem' }}>
                 <tr>
                   <th style={{ padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm) 0 0 0' }}>Case Name</th>
                   <th style={{ padding: '0.75rem 1rem' }}>Jurisdiction</th>
                   <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                   <th style={{ padding: '0.75rem 1rem', textAlign: 'right', borderRadius: '0 var(--radius-sm) 0 0' }}>Actions</th>
                 </tr>
               </thead>
               <tbody style={{ borderTop: '1px solid var(--border-color)' }}>
                 {cases.map((c: any) => (
                   <tr key={c.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                     <td style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>
                       <Link href={`/cases/${c.slug}`} style={{ color: 'var(--text-primary)', textDecoration: 'none' }} onMouseOver={(e) => e.currentTarget.style.color = 'var(--accent-primary)'} onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-primary)'}>
                         {c.caseName}
                       </Link>
                     </td>
                     <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>{c.jurisdiction}</td>
                     <td style={{ padding: '0.75rem 1rem' }}>
                       <span style={{ padding: '0.25rem 0.5rem', background: 'rgba(255, 255, 255, 0.1)', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem' }}>{c.statusPublic}</span>
                     </td>
                     <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                        <form action={async () => {
                          'use server'
                          await deleteCase(c.id);
                        }}>
                          <button type="submit" style={{ color: '#ef4444', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}>
                            Delete
                          </button>
                        </form>
                     </td>
                   </tr>
                 ))}
                 {cases.length === 0 && (
                   <tr>
                     <td colSpan={4} style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No cases in database.</td>
                   </tr>
                 )}
               </tbody>
             </table>
           </div>
        </div>

      </div>
    </div>
  );
}
