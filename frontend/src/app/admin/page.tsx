import { getCases } from '@/actions/cases';
import { deleteCase, createBasicCase } from '@/actions/admin';
import Link from 'next/link';

export default async function AdminPage() {
  const cases = await getCases();

  return (
    <div className="space-y-8 animate-in fade-in">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">Admin Panel</h1>
        <p className="text-muted-foreground w-full max-w-2xl">
          Manage the database curations, add new cases, and handle taxonomy mapping.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* ADD CASE FORM */}
        <div className="glass-card p-6 rounded-xl self-start">
          <h2 className="text-xl font-semibold mb-4 border-b border-border pb-2">Add Basic Case</h2>
          <form action={createBasicCase} className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Case Name</label>
              <input name="caseName" required className="w-full bg-secondary text-secondary-foreground rounded-md px-3 py-2 text-sm border border-border focus:ring-2 focus:ring-primary outline-none transition-all" placeholder="e.g. Doe v. AI Corp" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">Jurisdiction</label>
                <input name="jurisdiction" required className="w-full bg-secondary text-secondary-foreground rounded-md px-3 py-2 text-sm border border-border focus:ring-2 focus:ring-primary outline-none" placeholder="State/Federal" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Country</label>
                <input name="country" required className="w-full bg-secondary text-secondary-foreground rounded-md px-3 py-2 text-sm border border-border focus:ring-2 focus:ring-primary outline-none" placeholder="USA" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Court Name</label>
              <input name="courtName" required className="w-full bg-secondary text-secondary-foreground rounded-md px-3 py-2 text-sm border border-border focus:ring-2 focus:ring-primary outline-none" placeholder="District Court of..." />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">Status</label>
                <select name="statusPublic" className="w-full bg-secondary text-secondary-foreground rounded-md px-3 py-2 text-sm border border-border focus:ring-2 focus:ring-primary outline-none">
                  <option value="Active">Active</option>
                  <option value="Closed">Closed</option>
                  <option value="Settled">Settled</option>
                  <option value="Dismissed">Dismissed</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Materiality</label>
                <select name="materialityScore" className="w-full bg-secondary text-secondary-foreground rounded-md px-3 py-2 text-sm border border-border focus:ring-2 focus:ring-primary outline-none">
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Short Summary</label>
              <textarea name="summaryShort" required rows={3} className="w-full bg-secondary text-secondary-foreground rounded-md px-3 py-2 text-sm border border-border focus:ring-2 focus:ring-primary outline-none resize-none" placeholder="Brief description of the suit..." />
            </div>

            <button type="submit" className="w-full bg-primary text-primary-foreground font-medium rounded-md py-2 hover:bg-primary/90 transition-colors">
              Create Case Entry
            </button>
          </form>
        </div>

        {/* LIST CASES */}
        <div className="lg:col-span-2 glass-card p-6 rounded-xl">
           <h2 className="text-xl font-semibold mb-4 border-b border-border pb-2">Manage Database</h2>
           <div className="overflow-x-auto">
             <table className="w-full text-sm text-left">
               <thead className="text-xs uppercase bg-secondary/50 text-muted-foreground">
                 <tr>
                   <th className="px-4 py-3 rounded-tl-md">Case Name</th>
                   <th className="px-4 py-3">Jurisdiction</th>
                   <th className="px-4 py-3">Status</th>
                   <th className="px-4 py-3 rounded-tr-md text-right">Actions</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-border">
                 {cases.map((c) => (
                   <tr key={c.id} className="hover:bg-secondary/30 transition-colors">
                     <td className="px-4 py-3 font-medium">
                       <Link href={`/cases/${c.slug}`} className="hover:text-primary transition-colors">
                         {c.caseName}
                       </Link>
                     </td>
                     <td className="px-4 py-3 text-muted-foreground">{c.jurisdiction}</td>
                     <td className="px-4 py-3">
                       <span className="px-2 py-1 bg-secondary rounded text-xs">{c.statusPublic}</span>
                     </td>
                     <td className="px-4 py-3 text-right">
                        {/* A tiny inline form to delete */}
                        <form action={async () => {
                          'use server'
                          await deleteCase(c.id);
                        }}>
                          <button type="submit" className="text-red-500 hover:text-red-400 text-xs font-semibold px-2 py-1">
                            Delete
                          </button>
                        </form>
                     </td>
                   </tr>
                 ))}
                 {cases.length === 0 && (
                   <tr>
                     <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No cases in database.</td>
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
