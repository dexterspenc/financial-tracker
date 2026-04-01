import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { format, subMonths } from 'date-fns';
import { User, Wallet, Tag, PiggyBank, LogOut, Plus, Pencil, Trash2, Check, X, ChevronLeft, Zap } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { useAccounts } from '../hooks/useAccounts';
import { useCategories } from '../hooks/useCategories';
import { useBudgets } from '../hooks/useBudgets';
import { supabase } from '../lib/supabase';
import { toast } from '../components/ui/Toast';
import './SettingsPage.css';

const PURPOSES = ['Living', 'Playing', 'Saving', 'Investment'];
const TABS = [
  { id: 'profil',         label: 'Profil',          Icon: User      },
  { id: 'akun',           label: 'Kelola Akun',      Icon: Wallet    },
  { id: 'kategori',       label: 'Kelola Kategori',  Icon: Tag       },
  { id: 'budget',         label: 'Budget',           Icon: PiggyBank },
  { id: 'quick-actions',  label: 'Quick Actions',    Icon: Zap       },
];

function SettingsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, signOut } = useAuth();

  const initialTab = searchParams.get('tab') || 'profil';
  const [activeTab, setActiveTab] = useState(initialTab);

  return (
    <div className="settings-page">
      <div className="settings-header">
        <button className="settings-back-btn" onClick={() => navigate(-1)}>
          <ChevronLeft size={20} />
        </button>
        <h1>Pengaturan</h1>
      </div>

      <div className="settings-tabs">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            className={`settings-tab ${activeTab === id ? 'active' : ''}`}
            onClick={() => setActiveTab(id)}
          >
            <Icon size={16} />
            <span>{label}</span>
          </button>
        ))}
      </div>

      <div className="settings-content">
        {activeTab === 'profil'        && <ProfilSection user={user} signOut={signOut} navigate={navigate} />}
        {activeTab === 'akun'          && <AkunSection userId={user?.id} />}
        {activeTab === 'kategori'      && <KategoriSection userId={user?.id} />}
        {activeTab === 'budget'        && <BudgetSection userId={user?.id} />}
        {activeTab === 'quick-actions' && <QuickActionsSection userId={user?.id} />}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   Profil
───────────────────────────────────────── */
function ProfilSection({ user, signOut, navigate }) {
  const [displayName, setDisplayName] = useState('');
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('user_settings')
      .select('display_name')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        setDisplayName(data?.display_name || '');
        setLoaded(true);
      });
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('user_settings')
      .upsert({ user_id: user.id, display_name: displayName }, { onConflict: 'user_id' });
    setSaving(false);
    if (error) toast.error('Gagal menyimpan profil');
    else toast.success('Profil disimpan');
  };

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) toast.error('Gagal keluar');
    else navigate('/login', { replace: true });
  };

  if (!loaded) return <div className="settings-loading"><div className="loading-spinner" /></div>;

  return (
    <div className="settings-section">
      <div className="settings-card">
        <h2>Informasi Akun</h2>

        <div className="settings-field">
          <label className="settings-label">Email</label>
          <input className="settings-input" value={user?.email || ''} disabled />
        </div>

        <div className="settings-field">
          <label className="settings-label">Nama Tampilan</label>
          <input
            className="settings-input"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Masukkan nama kamu"
          />
        </div>

        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? <span className="spinner" /> : 'Simpan Perubahan'}
        </button>
      </div>

      <div className="settings-card danger-card">
        <h2>Sesi</h2>
        <p className="settings-helper">Keluar dari semua perangkat aktif.</p>
        <button className="btn btn-danger" onClick={handleSignOut}>
          <LogOut size={16} />
          Keluar
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   Kelola Akun
───────────────────────────────────────── */
function AkunSection({ userId }) {
  const { refetch } = useData();
  const { fetchAccounts } = useAccounts();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', purpose: 'Living', sort_order: 99 });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
  }, [userId]);

  const load = async () => {
    setLoading(true);
    const { data } = await fetchAccounts(userId);
    setAccounts(data);
    setLoading(false);
  };

  const startEdit = (acc) => {
    setEditingId(acc.id);
    setEditForm({ name: acc.name, purpose: acc.purpose, sort_order: acc.sort_order });
  };

  const saveEdit = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('accounts')
      .update({ name: editForm.name, purpose: editForm.purpose, sort_order: Number(editForm.sort_order) })
      .eq('id', editingId);
    setSaving(false);
    if (error) { toast.error('Gagal menyimpan'); return; }
    toast.success('Akun diperbarui');
    setEditingId(null);
    load();
    refetch().catch(() => {});
  };

  const deactivate = async (id) => {
    const { error } = await supabase
      .from('accounts')
      .update({ is_active: false })
      .eq('id', id);
    if (error) { toast.error('Gagal menonaktifkan akun'); return; }
    toast.success('Akun dinonaktifkan');
    load();
    refetch().catch(() => {});
  };

  const handleAdd = async () => {
    if (!addForm.name.trim()) { toast.error('Nama akun wajib diisi'); return; }
    setSaving(true);
    const { error } = await supabase
      .from('accounts')
      .insert({ user_id: userId, name: addForm.name.trim(), purpose: addForm.purpose, sort_order: Number(addForm.sort_order), is_active: true });
    setSaving(false);
    if (error) { toast.error('Gagal menambah akun'); return; }
    toast.success('Akun ditambahkan');
    setShowAdd(false);
    setAddForm({ name: '', purpose: 'Living', sort_order: 99 });
    load();
    refetch().catch(() => {});
  };

  if (loading) return <div className="settings-loading"><div className="loading-spinner" /></div>;

  return (
    <div className="settings-section">
      <div className="settings-card">
        <div className="settings-card-header">
          <h2>Daftar Akun</h2>
          <button className="btn btn-sm btn-primary" onClick={() => setShowAdd(!showAdd)}>
            <Plus size={14} /> Tambah
          </button>
        </div>

        {showAdd && (
          <div className="settings-add-form">
            <input
              className="settings-input"
              placeholder="Nama akun (cth: BCA, Cash)"
              value={addForm.name}
              onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
            />
            <select
              className="settings-select"
              value={addForm.purpose}
              onChange={(e) => setAddForm({ ...addForm, purpose: e.target.value })}
            >
              {PURPOSES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <div className="settings-add-actions">
              <button className="btn btn-sm btn-primary" onClick={handleAdd} disabled={saving}>
                {saving ? <span className="spinner" /> : <><Check size={13} /> Simpan</>}
              </button>
              <button className="btn btn-sm btn-secondary" onClick={() => setShowAdd(false)}>
                <X size={13} /> Batal
              </button>
            </div>
          </div>
        )}

        <div className="settings-list">
          {accounts.length === 0 && (
            <div className="settings-empty">Belum ada akun aktif</div>
          )}
          {accounts.map(acc => (
            <div key={acc.id} className="settings-list-item">
              {editingId === acc.id ? (
                <div className="settings-inline-edit">
                  <input
                    className="settings-input settings-input-sm"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  />
                  <select
                    className="settings-select"
                    value={editForm.purpose}
                    onChange={(e) => setEditForm({ ...editForm, purpose: e.target.value })}
                  >
                    {PURPOSES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <div className="settings-inline-actions">
                    <button className="icon-btn icon-btn-success" onClick={saveEdit} disabled={saving}>
                      <Check size={14} />
                    </button>
                    <button className="icon-btn" onClick={() => setEditingId(null)}>
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="settings-item-info">
                    <div className="settings-item-name">{acc.name}</div>
                    <div className="settings-item-sub">{acc.purpose}</div>
                  </div>
                  <div className="settings-item-actions">
                    <button className="icon-btn" onClick={() => startEdit(acc)}>
                      <Pencil size={14} />
                    </button>
                    <button className="icon-btn icon-btn-danger" onClick={() => deactivate(acc.id)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   Kelola Kategori
───────────────────────────────────────── */
function KategoriSection({ userId }) {
  const { refetch } = useData();
  const { fetchCategories } = useCategories();
  const [categories, setCategories] = useState([]);
  const [filter, setFilter] = useState('Expense');
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', flow_type: 'Expense', sort_order: 99 });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
  }, [userId]);

  const load = async () => {
    setLoading(true);
    const { data } = await fetchCategories(userId);
    setCategories(data);
    setLoading(false);
  };

  const startEdit = (cat) => {
    setEditingId(cat.id);
    setEditForm({ name: cat.name, flow_type: cat.flow_type, sort_order: cat.sort_order });
  };

  const saveEdit = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('categories')
      .update({ name: editForm.name, flow_type: editForm.flow_type, sort_order: Number(editForm.sort_order) })
      .eq('id', editingId);
    setSaving(false);
    if (error) { toast.error('Gagal menyimpan'); return; }
    toast.success('Kategori diperbarui');
    setEditingId(null);
    load();
    refetch().catch(() => {});
  };

  const deactivate = async (id) => {
    const { error } = await supabase
      .from('categories')
      .update({ is_active: false })
      .eq('id', id);
    if (error) { toast.error('Gagal menonaktifkan kategori'); return; }
    toast.success('Kategori dinonaktifkan');
    load();
    refetch().catch(() => {});
  };

  const handleAdd = async () => {
    if (!addForm.name.trim()) { toast.error('Nama kategori wajib diisi'); return; }
    setSaving(true);
    const { error } = await supabase
      .from('categories')
      .insert({ user_id: userId, name: addForm.name.trim(), flow_type: addForm.flow_type, sort_order: Number(addForm.sort_order), is_active: true });
    setSaving(false);
    if (error) { toast.error('Gagal menambah kategori'); return; }
    toast.success('Kategori ditambahkan');
    setShowAdd(false);
    setAddForm({ name: '', flow_type: 'Expense', sort_order: 99 });
    load();
    refetch().catch(() => {});
  };

  const visible = categories.filter(c => c.flow_type === filter);

  if (loading) return <div className="settings-loading"><div className="loading-spinner" /></div>;

  return (
    <div className="settings-section">
      <div className="settings-card">
        <div className="settings-card-header">
          <h2>Daftar Kategori</h2>
          <button className="btn btn-sm btn-primary" onClick={() => setShowAdd(!showAdd)}>
            <Plus size={14} /> Tambah
          </button>
        </div>

        <div className="settings-filter-tabs">
          {['Expense', 'Income', 'Transfer'].map(ft => (
            <button
              key={ft}
              className={`filter-tab ${filter === ft ? 'active' : ''}`}
              onClick={() => setFilter(ft)}
            >
              {ft === 'Expense' ? 'Pengeluaran' : ft === 'Income' ? 'Pemasukan' : 'Transfer'}
            </button>
          ))}
        </div>

        {showAdd && (
          <div className="settings-add-form">
            <input
              className="settings-input"
              placeholder="Nama kategori"
              value={addForm.name}
              onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
            />
            <select
              className="settings-select"
              value={addForm.flow_type}
              onChange={(e) => setAddForm({ ...addForm, flow_type: e.target.value })}
            >
              <option value="Expense">Pengeluaran</option>
              <option value="Income">Pemasukan</option>
              <option value="Transfer">Transfer</option>
            </select>
            <div className="settings-add-actions">
              <button className="btn btn-sm btn-primary" onClick={handleAdd} disabled={saving}>
                {saving ? <span className="spinner" /> : <><Check size={13} /> Simpan</>}
              </button>
              <button className="btn btn-sm btn-secondary" onClick={() => setShowAdd(false)}>
                <X size={13} /> Batal
              </button>
            </div>
          </div>
        )}

        <div className="settings-list">
          {visible.length === 0 && (
            <div className="settings-empty">Belum ada kategori di jenis ini</div>
          )}
          {visible.map(cat => (
            <div key={cat.id} className="settings-list-item">
              {editingId === cat.id ? (
                <div className="settings-inline-edit">
                  <input
                    className="settings-input settings-input-sm"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  />
                  <div className="settings-inline-actions">
                    <button className="icon-btn icon-btn-success" onClick={saveEdit} disabled={saving}>
                      <Check size={14} />
                    </button>
                    <button className="icon-btn" onClick={() => setEditingId(null)}>
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="settings-item-info">
                    <div className="settings-item-name">{cat.name}</div>
                  </div>
                  <div className="settings-item-actions">
                    <button className="icon-btn" onClick={() => startEdit(cat)}>
                      <Pencil size={14} />
                    </button>
                    <button className="icon-btn icon-btn-danger" onClick={() => deactivate(cat.id)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   Budget
───────────────────────────────────────── */
function BudgetSection({ userId }) {
  const { refetch } = useData();
  const { fetchBudgets, upsertBudget, deleteBudget } = useBudgets();
  const { fetchCategories } = useCategories();
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [categories, setCategories] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [inputs, setInputs] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCategories();
  }, [userId]);

  useEffect(() => {
    if (categories.length > 0) loadBudgets();
  }, [selectedMonth, categories]);

  const loadCategories = async () => {
    const { data } = await fetchCategories(userId);
    setCategories(data.filter(c => c.flow_type === 'Expense'));
  };

  const loadBudgets = async () => {
    setLoading(true);
    const { data } = await fetchBudgets(userId, selectedMonth);
    setBudgets(data);
    const map = {};
    data.forEach(b => { map[b.category_id] = b.amount; });
    setInputs(map);
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const monthDb = selectedMonth + '-01';
    const upserts = Object.entries(inputs)
      .filter(([, amt]) => amt !== '' && amt !== undefined && amt !== null)
      .map(([catId, amt]) => ({
        user_id: userId,
        category_id: catId,
        month: monthDb,
        amount: parseFloat(amt) || 0,
      }));

    if (upserts.length > 0) {
      const { error } = await supabase
        .from('budgets')
        .upsert(upserts, { onConflict: 'user_id,category_id,month' });
      if (error) { toast.error('Gagal menyimpan budget'); setSaving(false); return; }
    }

    // Delete entries with amount = 0 or empty
    const toDelete = Object.entries(inputs)
      .filter(([, amt]) => !amt || parseFloat(amt) === 0)
      .map(([catId]) => catId);

    for (const catId of toDelete) {
      await deleteBudget(userId, catId, selectedMonth);
    }

    toast.success('Budget disimpan');
    setSaving(false);
    loadBudgets();
    refetch().catch(() => {});
  };

  const copyFromLastMonth = async () => {
    const lastMonth = format(subMonths(new Date(selectedMonth + '-01'), 1), 'yyyy-MM');
    const { data } = await fetchBudgets(userId, lastMonth);
    if (!data.length) { toast.info('Tidak ada budget bulan lalu'); return; }
    const map = {};
    data.forEach(b => { map[b.category_id] = b.amount; });
    setInputs(map);
    toast.success('Budget bulan lalu dimuat. Klik Simpan untuk menyimpan.');
  };

  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const d = subMonths(new Date(), i);
    return { value: format(d, 'yyyy-MM'), label: format(d, 'MMMM yyyy') };
  });

  if (loading) return <div className="settings-loading"><div className="loading-spinner" /></div>;

  return (
    <div className="settings-section">
      <div className="settings-card">
        <div className="settings-card-header">
          <h2>Budget Pengeluaran</h2>
          <select
            className="settings-select settings-select-sm"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          >
            {monthOptions.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>

        <p className="settings-helper">
          Tetapkan target pengeluaran per kategori untuk{' '}
          <strong>{format(new Date(selectedMonth + '-01'), 'MMMM yyyy')}</strong>.
          Kosongkan atau isi 0 untuk menghapus.
        </p>

        <div className="budget-settings-list">
          {categories.map(cat => (
            <div key={cat.id} className="budget-settings-row">
              <span className="budget-cat-name">{cat.name}</span>
              <div className="budget-input-wrap">
                <span className="budget-prefix">Rp</span>
                <input
                  type="number"
                  className="budget-input"
                  placeholder="0"
                  value={inputs[cat.id] ?? ''}
                  onChange={(e) => setInputs({ ...inputs, [cat.id]: e.target.value })}
                  min="0"
                />
              </div>
            </div>
          ))}

          {categories.length === 0 && (
            <div className="settings-empty">Belum ada kategori pengeluaran</div>
          )}
        </div>

        <div className="budget-settings-actions">
          <button className="btn btn-secondary btn-sm" onClick={copyFromLastMonth}>
            Salin dari Bulan Lalu
          </button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <span className="spinner" /> : 'Simpan Budget'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   Quick Actions
───────────────────────────────────────── */
function QuickActionsSection({ userId }) {
  const { accounts, categories, refetch } = useData();
  const [slots, setSlots]           = useState([null, null, null, null]);
  const [loading, setLoading]       = useState(true);
  const [editingSlot, setEditingSlot] = useState(null); // null | 0–3
  const [editForm, setEditForm]     = useState({ category_id: '', default_account_id: '' });
  const [saving, setSaving]         = useState(false);

  useEffect(() => { load(); }, [userId]);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('user_settings')
      .select('quick_actions')
      .eq('user_id', userId)
      .single();
    const raw = data?.quick_actions;
    setSlots(Array.isArray(raw) && raw.length === 4 ? raw : [null, null, null, null]);
    setLoading(false);
  };

  const persistSlots = async (newSlots) => {
    setSaving(true);
    const { error } = await supabase
      .from('user_settings')
      .upsert({ user_id: userId, quick_actions: newSlots }, { onConflict: 'user_id' });
    setSaving(false);
    if (error) { toast.error('Gagal menyimpan'); return false; }
    return true;
  };

  const handleSaveSlot = async () => {
    if (!editForm.category_id)        { toast.error('Pilih kategori'); return; }
    if (!editForm.default_account_id) { toast.error('Pilih akun default'); return; }
    const newSlots = [...slots];
    newSlots[editingSlot] = {
      category_id:        editForm.category_id,
      default_account_id: editForm.default_account_id,
    };
    if (await persistSlots(newSlots)) {
      setSlots(newSlots);
      setEditingSlot(null);
      toast.success('Quick Action disimpan');
      refetch().catch(() => {});
    }
  };

  const handleDeleteSlot = async (idx) => {
    const newSlots = [...slots];
    newSlots[idx] = null;
    if (await persistSlots(newSlots)) {
      setSlots(newSlots);
      toast.success('Quick Action dihapus');
      refetch().catch(() => {});
    }
  };

  const startEdit = (idx) => {
    const slot = slots[idx];
    setEditForm({
      category_id:        slot?.category_id        ?? '',
      default_account_id: slot?.default_account_id ?? '',
    });
    setEditingSlot(idx);
  };

  const expenseCategories  = categories.filter(c => c.flow_type === 'Expense');
  const incomeCategories   = categories.filter(c => c.flow_type === 'Income');
  const transferCategories = categories.filter(c => c.flow_type === 'Transfer');

  const accountsByPurpose = accounts.reduce((groups, acc) => {
    if (!groups[acc.purpose]) groups[acc.purpose] = [];
    groups[acc.purpose].push(acc);
    return groups;
  }, {});

  const getCategoryName = (id) => categories.find(c => c.id === id)?.name ?? '—';
  const getAccountName  = (id) => accounts.find(a => a.id === id)?.name ?? '—';

  if (loading) return <div className="settings-loading"><div className="loading-spinner" /></div>;

  return (
    <div className="settings-section">
      <div className="settings-card">
        <h2>Quick Actions</h2>
        <p className="settings-helper">
          Konfigurasi 4 tombol pintasan di halaman tambah transaksi.
          Tiap slot berisi kategori dan akun default yang langsung dipakai saat tombol ditekan.
        </p>

        <div className="settings-list">
          {slots.map((slot, idx) => (
            <div key={idx} className="settings-list-item">

              {editingSlot === idx ? (
                <div className="qa-settings-edit">
                  <div className="qa-settings-row">
                    <label>Kategori</label>
                    <select
                      className="settings-select"
                      value={editForm.category_id}
                      onChange={e => setEditForm({ ...editForm, category_id: e.target.value })}
                    >
                      <option value="">Pilih Kategori</option>
                      {expenseCategories.length > 0 && (
                        <optgroup label="Pengeluaran">
                          {expenseCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </optgroup>
                      )}
                      {incomeCategories.length > 0 && (
                        <optgroup label="Pemasukan">
                          {incomeCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </optgroup>
                      )}
                      {transferCategories.length > 0 && (
                        <optgroup label="Transfer">
                          {transferCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </optgroup>
                      )}
                    </select>
                  </div>
                  <div className="qa-settings-row">
                    <label>Akun Default</label>
                    <select
                      className="settings-select"
                      value={editForm.default_account_id}
                      onChange={e => setEditForm({ ...editForm, default_account_id: e.target.value })}
                    >
                      <option value="">Pilih Akun</option>
                      {Object.entries(accountsByPurpose).map(([purpose, accs]) => (
                        <optgroup key={purpose} label={purpose}>
                          {accs.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                  <div className="settings-add-actions">
                    <button className="btn btn-sm btn-primary" onClick={handleSaveSlot} disabled={saving}>
                      {saving ? <span className="spinner" /> : <><Check size={13} /> Simpan</>}
                    </button>
                    <button className="btn btn-sm btn-secondary" onClick={() => setEditingSlot(null)}>
                      <X size={13} /> Batal
                    </button>
                  </div>
                </div>

              ) : slot ? (
                <>
                  <div className="settings-item-info">
                    <div className="settings-item-name">{getCategoryName(slot.category_id)}</div>
                    <div className="settings-item-sub">Akun: {getAccountName(slot.default_account_id)}</div>
                  </div>
                  <div className="settings-item-actions">
                    <button className="icon-btn" onClick={() => startEdit(idx)}>
                      <Pencil size={14} />
                    </button>
                    <button className="icon-btn icon-btn-danger" onClick={() => handleDeleteSlot(idx)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </>

              ) : (
                <button type="button" className="qa-add-slot-btn" onClick={() => startEdit(idx)}>
                  <Plus size={14} />
                  Tambah Slot {idx + 1}
                </button>
              )}

            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;
