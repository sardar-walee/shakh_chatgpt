import React, {useEffect, useMemo, useState} from "react";
import {createRoot} from "react-dom/client";
import {ShoppingCart, Search, UserRound, Bike, Store, Utensils, Shirt, Sparkles, CarFront, ShieldCheck, Plus, Trash2, LayoutDashboard, Wallet, Package, Languages, Menu, X} from "lucide-react";
import {isSupabaseConfigured, supabase} from "./lib/supabase";
import {mapConfig} from "./lib/platform";
import "./styles.css";

type Role="super_admin"|"admin"|"captain"|"restaurant"|"supermarket"|"fashion"|"beauty"|"car_dealer"|"customer";
type Product={id:string;name:string;category:string;price:number;emoji:string;owner:string;status:string};
const roles: {id:Role;ku:string;ar:string;en:string;icon:React.ReactNode}[]=[
{id:"restaurant",ku:"چێشتخانە",ar:"مطعم",en:"Restaurant",icon:<Utensils/>},
{id:"supermarket",ku:"سوپەرمارکێت",ar:"سوبرماركت",en:"Supermarket",icon:<Store/>},
{id:"fashion",ku:"جل و بەرگ",ar:"أزياء",en:"Fashion",icon:<Shirt/>},
{id:"beauty",ku:"جوانکاری",ar:"تجميل",en:"Beauty",icon:<Sparkles/>},
{id:"car_dealer",ku:"ئۆتۆمبێل",ar:"سيارات",en:"Cars",icon:<CarFront/>},
{id:"captain",ku:"گەیاندن",ar:"توصيل",en:"Delivery",icon:<Bike/>}
];
const seed:Product[]=[
{id:"demo-1",name:"برگر تایبەتی شاخ",category:"restaurant",price:8500,emoji:"🍔",owner:"چێشتخانەی شاخ",status:"active"},
{id:"demo-2",name:"سەبەتەی خێزانی",category:"supermarket",price:35000,emoji:"🛒",owner:"سوپەرمارکێتی شاخ",status:"active"},
{id:"demo-3",name:"جلی هاوینە",category:"fashion",price:28000,emoji:"👕",owner:"شاخ فاشن",status:"active"},
{id:"demo-4",name:"کۆمەڵەی جوانکاری",category:"beauty",price:22000,emoji:"💄",owner:"شاخ بیوتی",status:"active"},
{id:"demo-5",name:"Toyota Corolla 2018",category:"car_dealer",price:18500000,emoji:"🚗",owner:"کڕیار",status:"active"}
];

function App(){
 const [lang,setLang]=useState<"ku"|"ar"|"en">("ku");
 const [role,setRole]=useState<Role>("customer");
 const [tab,setTab]=useState("home");
 const [search,setSearch]=useState("");
 const [category,setCategory]=useState("all");
 const [cart,setCart]=useState<Product[]>([]);
 const [products,setProducts]=useState<Product[]>(seed);
 const [userId,setUserId]=useState<string|null>(null);
 const [loading,setLoading]=useState(isSupabaseConfigured);
 const [authMode,setAuthMode]=useState<"login"|"signup">("login");
 const [authEmail,setAuthEmail]=useState("");
 const [authPassword,setAuthPassword]=useState("");
 const [authName,setAuthName]=useState("");
 const [authBusy,setAuthBusy]=useState(false);
 const [authMessage,setAuthMessage]=useState("");
 const [installPrompt,setInstallPrompt]=useState<any>(null);
 const [updateReady,setUpdateReady]=useState(false);
 const [showMenu,setShowMenu]=useState(false);
 const [notice,setNotice]=useState("");
 const [form,setForm]=useState({name:"",price:"",category:"restaurant",emoji:"📦"});
 const t=(ku:string,ar:string,en:string)=>lang==="ku"?ku:lang==="ar"?ar:en;
 useEffect(()=>{void loadData()},[]);
 useEffect(()=>{
  const install=(event:Event)=>{event.preventDefault();setInstallPrompt(event)};
  window.addEventListener("beforeinstallprompt",install);
  const onMessage=(event:MessageEvent)=>{if(event.data?.type==="APP_UPDATE_READY")setUpdateReady(true)};
  navigator.serviceWorker?.addEventListener("message",onMessage);
  if("serviceWorker" in navigator)void navigator.serviceWorker.register("/sw.js");
  return()=>{window.removeEventListener("beforeinstallprompt",install);navigator.serviceWorker?.removeEventListener("message",onMessage)};
 },[]);
 useEffect(()=>{
  const client=supabase;
  if(!client)return;
  const channel=client.channel("posts-live").on("postgres_changes",{event:"*",schema:"public",table:"posts"},()=>{void loadData()}).subscribe();
  return()=>{void client.removeChannel(channel)};
 },[userId]);
 async function loadData(){
  if(!supabase){setLoading(false);return;}
  const {data:sessionData}=await supabase.auth.getSession();
    const session=sessionData.session;
  setUserId(session?.user.id??null);
    const query=supabase.from("posts").select("id,title,category,price,status,image_url,profiles(full_name)").eq("status","active").order("created_at",{ascending:false});
    const {data,error}=await query;
    if(!error&&data){setProducts(data.map((post:any)=>({id:post.id,name:post.title,category:post.category,price:Number(post.price),emoji:post.image_url||"📦",owner:post.profiles?.full_name||"SHAKH SUPER",status:post.status})))}
  setLoading(false);
 }
 async function authenticate(){
  if(!supabase){setAuthMessage(t("پەیوەندی Supabase ڕێک نەخراوە","لم يتم إعداد اتصال Supabase","Supabase is not configured"));return;}
  if(!authEmail||!authPassword)return;
    setAuthBusy(true);setAuthMessage("");
    const result=authMode==="signup"
     ?await supabase.auth.signUp({email:authEmail,password:authPassword,options:{data:{full_name:authName}}})
     :await supabase.auth.signInWithPassword({email:authEmail,password:authPassword});
    if(result.error){setAuthMessage(result.error.message);setAuthBusy(false);return;}
    if(authMode==="signup"&&!result.data.session){setAuthMessage(t("ئیمەیڵەکەت پشتڕاست بکەرەوە، پاشان بچۆ ژوورەوە","تحقق من بريدك الإلكتروني ثم سجل الدخول","Check your email, then sign in"));}
    else {setAuthMessage("");await loadData();}
    setAuthBusy(false);
 }
 async function signOut(){if(supabase)await supabase.auth.signOut();setUserId(null);setRole("customer");}
 async function installApp(){if(!installPrompt)return;await installPrompt.prompt();setInstallPrompt(null);}
 function refreshApp(){navigator.serviceWorker?.controller?.postMessage({type:"SKIP_WAITING"});window.location.reload();}
 const visible=useMemo(()=>products.filter(p=>(category==="all"||p.category===category)&&`${p.name} ${p.owner}`.toLowerCase().includes(search.toLowerCase())&&p.status==="active"),[products,category,search]);
 const money=(n:number)=>new Intl.NumberFormat("en-US").format(n)+" د.ع";
 async function add(){
  if(!form.name||!form.price)return;
  if(supabase&&userId){
   const {error}=await supabase.from("posts").insert({owner_id:userId,title:form.name,category:form.category,price:+form.price,image_url:form.emoji||"📦"});
   if(error){setNotice(error.message);return;}
   await loadData();
  } else setProducts(p=>[...p,{id:`demo-${Date.now()}`,name:form.name,price:+form.price,category:form.category,emoji:form.emoji||"📦",owner:role,status:"active"}]);
  setNotice(t("پۆستەکە زیاد کرا","تمت إضافة المنشور","Post added"));setForm({...form,name:"",price:""});
 }
 function buy(p:Product){setCart(c=>[...c,p]);setNotice(t("کالا زیاد کرا بۆ سەبەتە","تمت إضافة المنتج للسلة","Added to cart"));}
 async function checkout(){
  if(cart.length===0)return;
  if(supabase&&userId){
   const productsTotal=cart.reduce((sum,product)=>sum+product.price,0);
   const {data:order,error}=await supabase.from("orders").insert({customer_id:userId,products_total:productsTotal,total:productsTotal}).select("id").single();
   if(error||!order){setNotice(error?.message||"Unable to create order");return;}
   const {error:itemError}=await supabase.from("order_items").insert(cart.map(product=>({order_id:order.id,post_id:product.id,unit_price:product.price})));
   if(itemError){setNotice(itemError.message);return;}
  }
  setCart([]);setNotice(t("داواکارییەکەت تۆمار کرا","تم تسجيل طلبك","Order placed"));
 }
 const canPost=role!=="customer";
 return <div className="app">
  <header className="topbar">
   <button className="iconbtn mobile" onClick={()=>setShowMenu(!showMenu)}>{showMenu?<X/>:<Menu/>}</button>
   <div className="brand" onClick={()=>{setTab("home");setCategory("all")}}><div className="brandmark">S</div><div><b>SHAKH <span>SUPER</span></b><small>{t("هەموو شتێک لە یەک شوێن","كل ما تحتاجه في مكان واحد","Everything in one place")}</small></div></div>
   <div className="search"><Search size={18}/><input placeholder={t("گەڕان بۆ کالا، چێشتخانە، ئۆتۆمبێل...","ابحث عن منتج أو سيارة...","Search products, restaurants, cars...")} value={search} onChange={e=>setSearch(e.target.value)}/></div>
    <div className="actions"><button className="lang" onClick={()=>setLang(lang==="ku"?"ar":lang==="ar"?"en":"ku")}><Languages size={17}/>{lang.toUpperCase()}</button><button className="cart" onClick={()=>setTab("cart")}><ShoppingCart size={19}/><span>{cart.length}</span></button>{userId?<button className="avatar" onClick={signOut} title={t("چوونەدەرەوە","تسجيل الخروج","Sign out")}><UserRound size={19}/></button>:<button className="avatar" onClick={()=>setTab("auth")} title={t("چوونەژوورەوە","تسجيل الدخول","Sign in")}><UserRound size={19}/></button>}</div>
  </header>
  <div className={"layout "+(showMenu?"open":"")}>
   <aside className="sidebar">
    <div className="side-title">{t("بەشەکان","الأقسام","Categories")}</div>
    <button className={category==="all"?"active":""} onClick={()=>{setCategory("all");setTab("home")}}>{<LayoutDashboard/>}{t("هەموو بەشەکان","كل الأقسام","All categories")}</button>
    {roles.map(r=><button key={r.id} className={category===r.id?"active":""} onClick={()=>{setCategory(r.id);setTab("home");setShowMenu(false)}}>{r.icon}<span>{t(r.ku,r.ar,r.en)}</span></button>)}
    <div className="side-title">{t("بەڕێوەبردن","الإدارة","Management")}</div>
    <button onClick={()=>setTab("dashboard")}><ShieldCheck/>{t("داشبۆرد","لوحة التحكم","Dashboard")}</button>
    <button onClick={()=>setTab("wallet")}><Wallet/>{t("پارە و مامەڵەکان","المحفظة والمعاملات","Wallet")}</button>
    {canPost&&<button onClick={()=>setTab("post")}><Plus/>{t("پۆستی نوێ","منشور جديد","New post")}</button>}
   </aside>
  <main className="main">
   {installPrompt&&<div className="notice">{t("ئەپەکە دابەزێنە بۆ ئەزموونی خێراتر","ثبّت التطبيق لتجربة أسرع","Install the app for a faster experience")}<button onClick={installApp}>{t("دابەزاندن","تثبيت","Install")}</button></div>}
   {updateReady&&<div className="notice">{t("نوێکردنەوەی نوێ بەردەستە؛ پەڕەکە نوێ بکەرەوە","تحديث جديد متاح؛ أعد فتح التطبيق","A new update is ready; reopen the app")}<button onClick={refreshApp}>{t("نوێکردنەوە","تحديث","Update")}</button></div>}
    <section className="hero"><div><div className="eyebrow">SHAKH SUPER</div><h1>{t("بازاڕی دیجیتاڵی شاخ","سوق شاخ الرقمي","Shakh digital marketplace")}</h1><p>{t("خواردن، کاڵا، جل و بەرگ، جوانکاری و ئۆتۆمبێل؛ هەمووی لە یەک ئەپ.","طعام، تسوق، أزياء، تجميل وسيارات في تطبيق واحد.","Food, shopping, fashion, beauty and cars in one app.")}</p><button onClick={()=>setCategory("all")}>{t("دەستپێبکە","ابدأ الآن","Start exploring")} <span>←</span></button></div><div className="hero-art">🛍️<div>🚗 🍔 👕 💄</div></div></section>
    {notice&&<div className="notice">{notice}<button onClick={()=>setNotice("")}>×</button></div>}
    {loading?<div className="panel"><p>{t("داتاکان بار دەکرێن...","جار تحميل البيانات...","Loading data...")}</p></div>:tab==="auth"?<Auth mode={authMode} setMode={setAuthMode} email={authEmail} setEmail={setAuthEmail} password={authPassword} setPassword={setAuthPassword} name={authName} setName={setAuthName} busy={authBusy} message={authMessage} submit={authenticate} t={t}/>:tab==="cart"?<Cart cart={cart} setCart={setCart} money={money} t={t} checkout={checkout}/>:tab==="post"?<Post form={form} setForm={setForm} add={add} t={t}/>:tab==="dashboard"?<Dashboard products={products} role={role} setRole={setRole} t={t}/>:tab==="wallet"?<WalletView money={money} t={t}/>:<><div className="section-head"><div><h2>{t("پۆستە نوێکان","المنشورات الجديدة","Latest posts")}</h2><p>{t("بەرهەمەکانت هەڵبژێرە و داواکاری بکە","اختر منتجاتك واطلب الآن","Choose products and order now")}</p></div><div className="role-select"><UserRound size={16}/><select value={role} onChange={e=>setRole(e.target.value as Role)}><option value="customer">{t("کڕیار","عميل","Customer")}</option>{roles.map(r=><option value={r.id} key={r.id}>{t(r.ku,r.ar,r.en)}</option>)}<option value="super_admin">Super Admin</option></select></div></div><div className="chips"><button className={category==="all"?"selected":""} onClick={()=>setCategory("all")}>{t("هەموو","الكل","All")}</button>{roles.map(r=><button className={category===r.id?"selected":""} onClick={()=>setCategory(r.id)} key={r.id}>{t(r.ku,r.ar,r.en)}</button>)}</div><div className="grid">{visible.map(p=><article className="card" key={p.id}><div className="product-image">{p.emoji}<span className="badge">{p.category==="car_dealer"?t("فرۆشتنی ئۆتۆمبێل","سيارة للبيع","For sale"):t("بەردەستە","متوفر","Available")}</span></div><div className="card-body"><small>{p.owner}</small><h3>{p.name}</h3><div className="price">{money(p.price)}</div><button className="add" onClick={()=>buy(p)}><Plus size={17}/>{t("زیادکردن بۆ سەبەتە","أضف للسلة","Add to cart")}</button></div></article>)}</div></>}
   </main>
  </div>
  <footer>{t("© شاخ سوپەر — پلاتفۆرمی فرۆشتن و گەیاندن","© شاخ سوبر — منصة التسوق والتوصيل","© Shakh Super — Marketplace & delivery platform")} <span>کوردی · عربي · English</span></footer>
 </div>
}
function Auth({mode,setMode,email,setEmail,password,setPassword,name,setName,busy,message,submit,t}:{mode:"login"|"signup";setMode:React.Dispatch<React.SetStateAction<"login"|"signup">>;email:string;setEmail:React.Dispatch<React.SetStateAction<string>>;password:string;setPassword:React.Dispatch<React.SetStateAction<string>>;name:string;setName:React.Dispatch<React.SetStateAction<string>>;busy:boolean;message:string;submit:()=>void;t:(a:string,b:string,c:string)=>string}){return <div className="panel"><h2>{mode==="login"?t("چوونەژوورەوە","تسجيل الدخول","Sign in"):t("دروستکردنی هەژمار","إنشاء حساب","Create account")}</h2><div className="form">{mode==="signup"&&<input placeholder={t("ناوی تەواو","الاسم الكامل","Full name")} value={name} onChange={e=>setName(e.target.value)}/>}<input type="email" autoComplete="email" placeholder={t("ئیمەیڵ","البريد الإلكتروني","Email")} value={email} onChange={e=>setEmail(e.target.value)}/><input type="password" autoComplete={mode==="login"?"current-password":"new-password"} placeholder={t("وشەی نهێنی","كلمة المرور","Password")} value={password} onChange={e=>setPassword(e.target.value)}/>{message&&<p className="notice">{message}</p>}<button className="primary" disabled={busy||!email||!password} onClick={submit}>{busy?t("چاوەڕوان بە...","انتظر...","Please wait..."):mode==="login"?t("چوونەژوورەوە","تسجيل الدخول","Sign in"):t("دروستکردنی هەژمار","إنشاء حساب","Create account")}</button><button type="button" className="linkbtn" onClick={()=>setMode(mode==="login"?"signup":"login")}>{mode==="login"?t("هەژمارت نییە؟ دروستی بکە","ليس لديك حساب؟ أنشئ حساباً","Create an account"):t("پێشتر هەژمارت هەیە؟ بچۆ ژوورەوە","لديك حساب؟ سجل الدخول","Already have an account? Sign in")}</button></div></div>}
function Cart({cart,setCart,money,t,checkout}:{cart:Product[];setCart:React.Dispatch<React.SetStateAction<Product[]>>;money:(n:number)=>string;t:(a:string,b:string,c:string)=>string;checkout:()=>void}){const total=cart.reduce((s,p)=>s+p.price,0);return <div className="panel"><h2>{t("سەبەتەی کڕین","سلة التسوق","Shopping cart")}</h2>{cart.length===0?<p>{t("سەبەتەکە بەتاڵە","السلة فارغة","Your cart is empty")}</p>:<>{cart.map((p,i)=><div className="cartrow" key={`${p.id}-${i}`}><span>{p.emoji} {p.name}</span><b>{money(p.price)}</b><button onClick={()=>setCart(c=>c.filter((_,j)=>j!==i))}><Trash2 size={16}/></button></div>)}<div className="total">{t("کۆی گشتی","المجموع","Total")} <b>{money(total)}</b></div><button className="primary" onClick={checkout}>{t("داواکاری بە کاش لە کاتی گەیاندن","الدفع نقداً عند الاستلام","Cash on delivery")} ✓</button></>}</div>}
function Post({form,setForm,add,t}:{form:any;setForm:any;add:()=>void;t:(a:string,b:string,c:string)=>string}){return <div className="panel"><h2>{t("پۆستی نوێ زیاد بکە","إضافة منشور جديد","Create new post")}</h2><div className="form"><input placeholder={t("ناوی کالا یان ئۆتۆمبێل","اسم المنتج أو السيارة","Product or car name")} value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/><input type="number" placeholder={t("نرخ بە دینار","السعر بالدينار","Price in IQD")} value={form.price} onChange={e=>setForm({...form,price:e.target.value})}/><select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>{roles.filter(r=>r.id!=="captain").map(r=><option value={r.id} key={r.id}>{t(r.ku,r.ar,r.en)}</option>)}</select><input placeholder="Emoji" value={form.emoji} onChange={e=>setForm({...form,emoji:e.target.value})}/><button className="primary" onClick={add}><Plus/> {t("پۆستکردن","نشر","Publish")}</button></div></div>}
function Dashboard({products,role,setRole,t}:{products:Product[];role:Role;setRole:any;t:(a:string,b:string,c:string)=>string}){return <div className="panel"><h2>{t("داشبۆردی بەڕێوەبردن","لوحة التحكم","Management dashboard")}</h2><div className="stats"><div><Package/><b>{products.length}</b><span>{t("کۆی پۆستەکان","إجمالي المنشورات","Total posts")}</span></div><div><Wallet/><b>1,250,000</b><span>{t("پارەی نموونەیی","رصيد تجريبي","Demo balance")}</span></div><div><Bike/><b>24</b><span>{t("گەیاندنی چالاک","طلبات التوصيل","Deliveries")}</span></div></div><label>{t("ڕۆڵی تاقیکردنەوە","دور التجربة","Demo role")}</label><select value={role} onChange={e=>setRole(e.target.value)}>{["super_admin","admin","captain","restaurant","supermarket","fashion","beauty","car_dealer","customer"].map(r=><option key={r}>{r}</option>)}</select><p>{t("ئەم داشبۆردە وەشانی سەرەتاییە؛ دەسەڵاتەکان لە Supabase بە RLS پارێزراون.","هذه لوحة أولية؛ الصلاحيات تحمى عبر Supabase RLS.","This is a starter dashboard; permissions are protected by Supabase RLS.")}</p></div>}
function WalletView({money,t}:{money:(n:number)=>string;t:(a:string,b:string,c:string)=>string}){return <div className="panel"><h2>{t("پارە و مامەڵەکان","المحفظة والمعاملات","Wallet & transactions")}</h2><div className="walletbig">{money(1250000)}<small>{t("باڵانسی نموونەیی","الرصيد التجريبي","Demo balance")}</small></div><div className="cartrow"><span>{t("پارەی کالا","قيمة المنتجات","Product amount")}</span><b>{money(1000000)}</b></div><div className="cartrow"><span>{t("پارەی گەیاندن","رسوم التوصيل","Delivery fee")}</span><b>{money(50000)}</b></div><div className="cartrow"><span>{t("کۆمسیۆنی شاخ","عمولة شاخ","Platform commission")}</span><b>{money(20000)}</b></div></div>}
createRoot(document.getElementById("root")!).render(<App/>);