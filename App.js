import './config-expose';

import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, Alert, SafeAreaView, ScrollView } from 'react-native';
import axios from 'axios';

/** ======== BASIC THEME (Zomato-ish) ======== */
const COLORS = {
  primary: '#E23744', // red
  dark: '#121212',
  text: '#1f2937',
  muted: '#6b7280',
  bg: '#ffffff',
  card: '#fafafa',
  line: '#e5e7eb',
  success: '#16a34a',
  warning: '#f59e0b'
};

const API_BASE = process.env.EXPO_PUBLIC_API_BASE || 'http://localhost:4000'; // change to your server URL (e.g. https://your-render.onrender.com)

const S = {
  screen: { flex: 1, backgroundColor: COLORS.bg },
  container: { padding: 16 },
  h1: { fontSize: 22, fontWeight: '700', color: COLORS.text },
  h2: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  p: { fontSize: 14, color: COLORS.muted },
  btn: { backgroundColor: COLORS.primary, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10, alignItems: 'center' },
  btnText: { color: 'white', fontWeight: '700' },
  card: { backgroundColor: COLORS.card, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: COLORS.line, marginBottom: 12 },
  input: { borderWidth: 1, borderColor: COLORS.line, borderRadius: 10, padding: 12, marginVertical: 6, fontSize: 14 },
  pill: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: COLORS.line, marginRight: 8, backgroundColor: 'white' },
  tabbar: { flexDirection: 'row', borderTopWidth: 1, borderColor: COLORS.line },
  tab: { flex: 1, padding: 12, alignItems: 'center' },
  tabText: { fontSize: 12, color: COLORS.muted },
  tabActive: { color: COLORS.primary, fontWeight: '700' }
};

const Money = ({ v }) => <Text style={{ fontWeight: '700' }}>₹{Number(v || 0).toFixed(0)}</Text>;

/** ======== FAKE AUTH (name + phone) ======== */
function useAuth() {
  const [user, setUser] = useState(null);
  const login = (name, phone) => setUser({ name, phone });
  const logout = () => setUser(null);
  return { user, login, logout };
}

/** ======== API HOOKS ======== */
async function fetchMenu() {
  try {
    const res = await axios.get(`${API_BASE}/menu`);
    return res.data;
  } catch (e) {
    // fallback demo data
    return {
      plans: [
        { id: 'd1', title: 'Daily Meal', price: 90, items: ['Roti x4', 'Dal', 'Sabzi', 'Rice', 'Salad'] },
        { id: 'm1', title: 'Monthly Veg', price: 3000, items: ['Lunch + Dinner (Veg)', 'Free Sunday sweet', 'Hygienic packing'] },
        { id: 'm2', title: 'Monthly Non-Veg', price: 3800, items: ['2 Non-veg days/week', 'Rest veg balanced meal'] }
      ],
      today: { day: 'Today', items: ['Jeera Rice', 'Dal Tadka', 'Mix Veg', 'Chapati', 'Raita'] }
    };
  }
}

async function placeOrder(payload) {
  try {
    const res = await axios.post(`${API_BASE}/orders`, payload);
    return res.data;
  } catch (e) {
    return { ok: true, id: `local_${Math.random().toString(36).slice(2,8)}`, offline: true };
  }
}

/** ======== SMALL UI HELPERS ======== */
const Section = ({ title, children, right }) => (
  <View style={{ marginBottom: 16 }}>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
      <Text style={S.h2}>{title}</Text>
      {right}
    </View>
    {children}
  </View>
);

const Chip = ({ label, onPress }) => (
  <TouchableOpacity onPress={onPress} style={S.pill}>
    <Text>{label}</Text>
  </TouchableOpacity>
);

/** ======== SCREENS ======== */
function LoginScreen({ onDone }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  return (
    <SafeAreaView style={S.screen}>
      <ScrollView contentContainerStyle={[S.container, { paddingTop: 48 }]}>
        <Text style={S.h1}>Welcome to Sharma Tiffin</Text>
        <Text style={[S.p, { marginTop: 6 }]}>Fast, homely and hygienic meals — delivered daily.</Text>

        <View style={[S.card, { marginTop: 16 }]}>
          <Text style={{ marginBottom: 6 }}>Full Name</Text>
          <TextInput value={name} onChangeText={setName} placeholder="e.g. Rahul Sharma" style={S.input} />
          <Text style={{ marginTop: 8, marginBottom: 6 }}>Mobile Number</Text>
          <TextInput value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="10-digit mobile" style={S.input} />
          <TouchableOpacity style={[S.btn, { marginTop: 8 }]} onPress={() => {
            if (name.length < 2 || phone.length < 10) return Alert.alert('Please enter a valid name and phone');
            onDone({ name, phone });
          }}>
            <Text style={S.btnText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function HomeScreen({ menu, onSelectPlan }) {
  return (
    <SafeAreaView style={S.screen}>
      <ScrollView contentContainerStyle={S.container}>
        <Section title="Today’s Menu">
          <View style={S.card}>
            <Text style={{ fontWeight: '700', marginBottom: 6 }}>{menu.today?.day || 'Today'}</Text>
            <Text style={S.p}>{(menu.today?.items || []).join(' • ')}</Text>
          </View>
        </Section>

        <Section title="Popular Plans">
          {menu.plans.map(p => (
            <View key={p.id} style={S.card}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 16, fontWeight: '700' }}>{p.title}</Text>
                <Money v={p.price} />
              </View>
              <Text style={[S.p, { marginTop: 4 }]}>{p.items.join(' • ')}</Text>
              <TouchableOpacity style={[S.btn, { marginTop: 10 }]} onPress={() => onSelectPlan(p)}>
                <Text style={S.btnText}>Choose {p.title}</Text>
              </TouchableOpacity>
            </View>
          ))}
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

function PlansScreen({ menu, onSelectPlan }) {
  const [filter, setFilter] = useState('All');
  const plans = menu.plans || [];
  const filtered = plans.filter(p => filter === 'All' ? true : p.title.toLowerCase().includes(filter.toLowerCase()));

  return (
    <SafeAreaView style={S.screen}>
      <ScrollView contentContainerStyle={S.container}>
        <Section title="Plans" right={<View style={{ flexDirection: 'row' }}>
          {['All', 'Daily', 'Monthly', 'Veg', 'Non-Veg'].map(x => <Chip key={x} label={x} onPress={() => setFilter(x)} />)}
        </View>}>
          {filtered.map(p => (
            <View key={p.id} style={S.card}>
              <Text style={{ fontSize: 16, fontWeight: '700' }}>{p.title} — <Money v={p.price} /></Text>
              <Text style={[S.p, { marginTop: 4 }]}>{p.items.join(' • ')}</Text>
              <TouchableOpacity style={[S.btn, { marginTop: 10 }]} onPress={() => onSelectPlan(p)}>
                <Text style={S.btnText}>Subscribe</Text>
              </TouchableOpacity>
            </View>
          ))}
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

function CheckoutScreen({ selected, user, onOrderPlaced }) {
  const [address, setAddress] = useState('');
  const [qty, setQty] = useState('1');
  const [note, setNote] = useState('');

  const total = useMemo(() => (Number(selected?.price || 0) * Number(qty || 1)), [selected, qty]);

  const doPay = async () => {
    if (!selected) return Alert.alert('No plan selected');
    if (!address) return Alert.alert('Please add delivery address');
    const payload = {
      customer: { name: user.name, phone: user.phone, address },
      items: [{ planId: selected.id, title: selected.title, qty: Number(qty), unitPrice: selected.price }],
      note
    };
    const res = await placeOrder(payload);
    onOrderPlaced(res);
  };

  return (
    <SafeAreaView style={S.screen}>
      <ScrollView contentContainerStyle={S.container}>
        <Section title="Plan">
          <View style={S.card}>
            <Text style={{ fontWeight: '700' }}>{selected?.title}</Text>
            <Text style={S.p}>Unit price: <Money v={selected?.price} /></Text>
          </View>
        </Section>
        <Section title="Delivery">
          <Text>Address</Text>
          <TextInput style={S.input} placeholder="House no, street, area, city" value={address} onChangeText={setAddress} />
          <Text>Quantity</Text>
          <TextInput style={S.input} value={qty} onChangeText={setQty} keyboardType="numeric" />
          <Text>Note</Text>
          <TextInput style={S.input} placeholder="No onion, less spicy…" value={note} onChangeText={setNote} />
        </Section>
        <View style={[S.card, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
          <Text style={{ fontWeight: '700' }}>Total</Text>
          <Money v={total} />
        </View>
        <TouchableOpacity style={[S.btn, { marginTop: 12 }]} onPress={doPay}>
          <Text style={S.btnText}>Place Order</Text>
        </TouchableOpacity>
        <Text style={[S.p, { marginTop: 10 }]}>Payment integration (UPI/Razorpay) can be plugged here.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function OrdersScreen({ orders }) {
  return (
    <SafeAreaView style={S.screen}>
      <ScrollView contentContainerStyle={S.container}>
        <Section title="My Orders">
          {orders.length === 0 && <Text style={S.p}>No orders yet.</Text>}
          {orders.map(o => (
            <View key={o.id} style={S.card}>
              <Text style={{ fontWeight: '700' }}>#{o.id.slice(0,6)} — {o.items[0].title}</Text>
              <Text style={S.p}>Qty: {o.items[0].qty} • <Money v={o.items[0].unitPrice * o.items[0].qty} /></Text>
              <Text style={[S.p, { marginTop: 4 }]}>Status: <Text style={{ color: COLORS.success }}>{o.status || 'placed'}</Text></Text>
            </View>
          ))}
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

function ProfileScreen({ user, onLogout }) {
  return (
    <SafeAreaView style={S.screen}>
      <ScrollView contentContainerStyle={S.container}>
        <Section title="Account">
          <View style={S.card}>
            <Text style={{ fontWeight: '700' }}>{user.name}</Text>
            <Text style={S.p}>{user.phone}</Text>
          </View>
        </Section>
        <Section title="Support">
          <View style={S.card}><Text>Call us: 8305484626</Text></View>
          <View style={S.card}><Text>Email: contact@sharmatiffin.example</Text></View>
        </Section>
        <TouchableOpacity onPress={onLogout} style={[S.btn, { backgroundColor: COLORS.dark }]}>
          <Text style={S.btnText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

/** ======== ROOT APP WITH SIMPLE TABS ======== */


/** ======== UPI PAY SCREEN ======== */
function UpiPayScreen({ onBack }) {
  const upi = (typeof globalThis?.SHARMA_CONFIG !== 'undefined' && globalThis.SHARMA_CONFIG.upiId) ? globalThis.SHARMA_CONFIG.upiId : 'prince190992-1@okicici';
  const [copied, setCopied] = React.useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(upi);
      setCopied(true);
      setTimeout(()=>setCopied(false), 2000);
    } catch(e){
      Alert.alert('Copy failed', 'Clipboard not available in this environment');
    }
  };

  return (
    <SafeAreaView style={S.screen}>
      <View style={[S.container, { paddingTop: 24 }]}>
        <Text style={S.h2}>Pay by UPI</Text>
        <View style={[S.card, { marginTop: 12 }]}>
          <Text style={{ marginBottom: 8 }}>Send payment to this UPI ID</Text>
          <Text selectable style={{ fontWeight:'600', fontSize:18 }}>{upi}</Text>
          <TouchableOpacity style={[S.btn, { marginTop:12 }]} onPress={copy}>
            <Text style={{ color:'#fff', textAlign:'center' }}>{copied ? 'COPIED' : 'COPY UPI ID'}</Text>
          </TouchableOpacity>
          <Text style={[S.p, { marginTop:12 }]}>After sending UPI, please go to Orders → tap the order and ask admin to mark it as paid (or use Razorpay for automatic verification).</Text>
        </View>
        <TouchableOpacity style={[S.btn, { marginTop:20 }]} onPress={onBack}>
          <Text style={{ color:'#fff', textAlign:'center' }}>Back</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
export default function App() {
  const auth = useAuth();
  const [menu, setMenu] = useState({ plans: [], today: { items: [] } });
  const [tab, setTab] = useState('Home');
  const [selected, setSelected] = useState(null);
  const [orders, setOrders] = useState([]);

  useEffect(() => { (async () => setMenu(await fetchMenu()))(); }, []);

  if (!auth.user) {
    return <LoginScreen onDone={(u) => auth.login(u.name, u.phone)} />;
  }

  let Screen = null;
  if (tab === 'Home') Screen = <HomeScreen menu={menu} onSelectPlan={(p) => { setSelected(p); setTab('Checkout'); }} />;
  if (tab === 'Plans') Screen = <PlansScreen menu={menu} onSelectPlan={(p) => { setSelected(p); setTab('Checkout'); }} />;
  if (tab === 'Checkout') Screen = <CheckoutScreen selected={selected} user={auth.user} onOrderPlaced={(res) => {
    const o = {
      id: res.id || `local_${Date.now()}`,
      items: [{ title: selected.title, qty: 1, unitPrice: selected.price }],
      status: 'placed'
    };
    setOrders([o, ...orders]);
    Alert.alert('Order placed!', `Your order id: ${o.id.slice(0,6)}`);
    setTab('Orders');
  }} />;
  if (tab === 'Orders') Screen = <OrdersScreen orders={orders} />;
  if (tab === 'Profile') Screen = <ProfileScreen user={auth.user} onLogout={auth.logout} />;

  const tabs = ['Home', 'Plans', 'Checkout', 'Orders', 'Profile'];

  return (
    <SafeAreaView style={S.screen}>
      <View style={{ flex: 1 }}>{Screen}</View>
      <View style={S.tabbar}>
        {tabs.map(t => (
          <TouchableOpacity key={t} onPress={() => setTab(t)} style={S.tab}>
            <Text style={[S.tabText, tab === t && S.tabActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}
