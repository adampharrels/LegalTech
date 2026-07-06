import { getCases } from '@/actions/cases';
import { analyzeCase, deleteCase, createBasicCase } from '@/actions/admin';
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
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>Add Case</h2>
          <form action={createBasicCase}>
            <div>
              <label style={labelStyle}>Case Name</label>
              <input name="caseName" required style={inputStyle} placeholder="e.g. Doe v. AI Corp" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={labelStyle}>Neutral Citation</label>
                <input name="neutralCitation" style={inputStyle} placeholder="[2026] FCA 123" />
              </div>
              <div>
                <label style={labelStyle}>Docket Number</label>
                <input name="docketNumber" style={inputStyle} placeholder="1:26-cv-00123" />
              </div>
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
                <label style={labelStyle}>Court Level</label>
                <input name="courtLevel" style={inputStyle} placeholder="Trial, Appeal, Federal" />
              </div>
              <div>
                <label style={labelStyle}>Filing Date</label>
                <input name="filingDate" type="date" style={inputStyle} />
              </div>
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

            <div>
              <label style={labelStyle}>Detailed Summary</label>
              <textarea name="summaryLong" rows={5} style={{ ...inputStyle, resize: 'vertical' }} placeholder="Facts, issues, procedural posture..." />
            </div>

            <div>
              <label style={labelStyle}>Why It Matters</label>
              <textarea name="whyItMatters" rows={3} style={{ ...inputStyle, resize: 'vertical' }} placeholder="Why this case matters for AI law or governance..." />
            </div>

            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '0.5rem' }}>
              <h3 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--text-secondary)' }}>Primary Source</h3>
              <div>
                <label style={labelStyle}>Source URL</label>
                <input name="sourceUrl" type="url" style={inputStyle} placeholder="https://..." />
              </div>
              <div>
                <label style={labelStyle}>Source Title</label>
                <input name="sourceTitle" style={inputStyle} placeholder="Complaint, judgment, docket entry..." />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={labelStyle}>Source Type</label>
                  <input name="sourceType" style={inputStyle} placeholder="Court record" />
                </div>
                <div>
                  <label style={labelStyle}>Publisher</label>
                  <input name="sourcePublisher" style={inputStyle} placeholder="Court / tribunal" />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Published Date</label>
                <input name="sourcePublishedAt" type="date" style={inputStyle} />
              </div>
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
                   <th style={{ padding: '0.75rem 1rem' }}>Review</th>
                   <th style={{ padding: '0.75rem 1rem', textAlign: 'right', borderRadius: '0 var(--radius-sm) 0 0' }}>Actions</th>
                 </tr>
               </thead>
               <tbody style={{ borderTop: '1px solid var(--border-color)' }}>
                 {cases.map((c) => (
                   <tr key={c.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                     <td style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>
                       <Link href={`/cases/${c.slug}`} className="hover-text-accent" style={{ color: 'var(--text-primary)', textDecoration: 'none' }}>
                         {c.caseName}
                       </Link>
                     </td>
                     <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>{c.jurisdiction}</td>
                     <td style={{ padding: '0.75rem 1rem' }}>
                       <span style={{ padding: '0.25rem 0.5rem', background: 'rgba(255, 255, 255, 0.1)', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem' }}>{c.statusPublic}</span>
                     </td>
                     <td style={{ padding: '0.75rem 1rem' }}>
                       {c.statusInternal === 'LLM reviewed' || c.statusInternal === 'Human reviewed' ? (
                         <Link href={`/cases/${c.slug}#ai-summary`} className="hover-text-accent" style={{ padding: '0.25rem 0.5rem', background: 'rgba(6, 182, 212, 0.12)', color: 'var(--accent-primary)', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', textDecoration: 'none' }}>
                           View AI summary
                         </Link>
                       ) : (
                         <span style={{ padding: '0.25rem 0.5rem', background: 'rgba(255, 255, 255, 0.08)', color: 'var(--text-secondary)', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem' }}>{c.statusInternal}</span>
                       )}
                     </td>
                     <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                          <form action={async () => {
                            'use server'
                            await analyzeCase(c.id);
                          }}>
                            <button type="submit" style={{ color: 'var(--accent-primary)', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}>
                              Summarise with AI
                            </button>
                          </form>
                          <form action={async () => {
                            'use server'
                            await deleteCase(c.id);
                          }}>
                            <button type="submit" style={{ color: '#ef4444', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}>
                              Delete
                            </button>
                          </form>
                        </div>
                     </td>
                   </tr>
                 ))}
                 {cases.length === 0 && (
                   <tr>
                     <td colSpan={5} style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No cases in database.</td>
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
