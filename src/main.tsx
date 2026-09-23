import React, {useEffect, useMemo, useState} from "react";
import {createRoot} from "react-dom/client";
import {ShoppingCart, Search, UserRound, Bike, Store, Utensils, Shirt, Sparkles, CarFront, ShieldCheck, Plus, Trash2, LayoutDashboard, Wallet, Package, Languages, Menu, X, Eye, EyeOff, Lock, Check, Copy, AlertCircle, Image as ImageIcon} from "lucide-react";
import {isSupabaseConfigured, supabase} from "./lib/supabase";
import {mapConfig} from "./lib/platform";
import AdminConsole from "./components/AdminConsole";
import "./styles.css";

type Role="super_admin"|"admin"|"captain"|"restaurant"|"supermarket"|"fashion"|"beauty"|"car_dealer"|"customer";

const merchantRoles: Role[] = ["restaurant", "supermarket", "fashion", "beauty", "car_dealer"];

function getAllowedPostCategories(userRole: Role): string[] {
  if (userRole === "super_admin" || userRole === "admin") {
    return ["restaurant", "supermarket", "fashion", "beauty", "car_dealer"];
  }
  if (merchantRoles.includes(userRole)) {
    return [userRole];
  }
  return ["restaurant", "supermarket", "fashion", "beauty", "car_dealer"];
}
type Product={id:string;name:string;description:string;category:string;price:number;emoji:string;owner:string;ownerId:string|null;status:string;attributes:Record<string,unknown>};
type UserProfile={id:string;full_name:string;phone:string;role:Role;email:string};
type WalletTransaction={id:string;type:string;kind?:string;amount:number;status:string;reference_id?:string|null;created_at:string;note?:string|null};
type Field={key:string;label:string;type:"text"|"number"|"date"|"select"|"multi"|"textarea";required?:boolean;options?:string[];placeholder?:string};
const roles: {id:Role;ku:string;ar:string;en:string;icon:React.ReactNode}[]=[
{id:"restaurant",ku:"چێشتخانە",ar:"مطعم",en:"Restaurant",icon:<Utensils/>},
{id:"supermarket",ku:"سوپەرمارکێت",ar:"سوبرماركت",en:"Supermarket",icon:<Store/>},
{id:"fashion",ku:"جل و بەرگ",ar:"أزياء",en:"Fashion",icon:<Shirt/>},
{id:"beauty",ku:"جوانکاری",ar:"تجميل",en:"Beauty",icon:<Sparkles/>},
{id:"car_dealer",ku:"ئۆتۆمبێل",ar:"سيارات",en:"Cars",icon:<CarFront/>},
{id:"captain",ku:"گەیاندن",ar:"توصيل",en:"Delivery",icon:<Bike/>}
];
const roleLabel=(role:Role,t:(a:string,b:string,c:string)=>string)=>{
 const labels:Record<Role,[string,string,string]>={
  super_admin:["بەڕێوەبەری گشتی","المدير العام","Super admin"],admin:["بەڕێوەبەر","المدير","Admin"],captain:["شۆفێر / گەیاندکار","السائق / المندوب","Driver / Captain"],restaurant:["خاوەنی چێشتخانە","صاحب المطعم","Restaurant merchant"],supermarket:["خاوەنی سوپەرمارکێت","صاحب السوبرماركت","Supermarket merchant"],fashion:["فرۆشیاری جل و بەرگ","بائع الأزياء","Fashion merchant"],beauty:["فرۆشیاری جوانکاری","بائع التجميل","Beauty merchant"],car_dealer:["فرۆشیاری ئۆتۆمبێل","بائع السيارات","Car merchant"],customer:["کڕیار","عميل","Customer"]
 };
 return t(...labels[role]);
};
const commonSizes=["XS","S","M","L","XL","XXL","XXXL"];
const shoeSizes=["36","37","38","39","40","41","42","43","44","45","46"];
const colors=["ڕەش / Black","سپی / White","سور / Red","شین / Blue","سەوز / Green","زەرد / Yellow","پەمەیی / Pink","مۆر / Purple","قاوەیی / Brown","خۆڵەمێشی / Gray","نارنجی / Orange"];
const field=(key:string,label:string,type:Field["type"],options?:string[],required=false):Field=>({key,label,type,options,required});
const categorySchemas:Record<string,Field[]>={
 fashion:[field("gender","جۆری بەکارهێنەر / Gender","select",["پیاوان / Men","ئافرەتان / Women","منداڵان / Kids","Unisex"],true),field("clothing_type","جۆری جل / Clothing type","select",["کراس / Shirt","پانتۆڵ / Trousers","تی‌شێرت / T-shirt","جاکەت / Jacket","کاڵا / Coat","فستان / Dress","جل و بەرگی منداڵان / Kidswear","پێڵاو / Shoes","سپۆرت / Sportswear","پێوەکراو / Accessories","هەر جۆرێکی تر / Other"],true),field("size","قەبارە / Size","multi",[...commonSizes,...shoeSizes,"Custom size"],true),field("custom_size","قەبارەی تایبەت / Custom size","text"),field("colors","ڕەنگ / Colors","multi",colors,true),field("custom_color","ڕەنگی تایبەت / Custom color","text"),field("brand","مارکە / Brand","text"),field("material","جۆری مادە / Material","text"),field("season","وەرز / Season","select",["بەهار / Spring","هاوین / Summer","پاییز / Autumn","زستان / Winter","هەموو وەرزەکان / All seasons"]),field("quantity","دانە / Quantity","number"),field("discount","داشکاندن % / Discount","number"),field("video_url","ڤیدیۆ / Video URL","text")],
 car_dealer:[field("make","مارکە / Make","text",undefined,true),field("model","مۆدێل / Model","text",undefined,true),field("model_year","ساڵ / Model year","number",undefined,true),field("location","شوێن / Location","text",undefined,true),field("vehicle_type","جۆر / Vehicle type","select",["Sedan","SUV","Crossover","Coupe","Hatchback","Pickup","Van","Truck","Motorcycle","Other"],true),field("fuel","بەنزین / Fuel","select",["Petrol","Diesel","Hybrid","Electric","LPG"]),field("transmission","گێڕ / Transmission","select",["Automatic","Manual","CVT"]),field("drive_type","جوڵان / Drive type","select",["FWD","RWD","AWD / 4WD"]),field("engine_size","قەبارەی ماتۆڕ / Engine size","text"),field("horsepower","هێزی ماتۆڕ / Horsepower","number"),field("cylinder","سیلندەر / Cylinder","number"),field("mileage","کارکردن / Mileage","number"),field("mileage_unit","یەکەی کارکردن / Mileage unit","select",["km","miles"]),field("exterior_color","ڕەنگی دەرەوە / Exterior color","text"),field("interior_color","ڕەنگی ناوەوە / Interior color","text"),field("seats","ژمارەی کورسی / Seats","number"),field("condition","دۆخ / Condition","select",["New","Used"],true),field("registration_status","بارودۆخی تۆمارکردن / Registration","text"),field("import_status","بارودۆخی هاوردە / Import status","text"),field("features","تایبەتمەندییەکان / Features","multi",["Sunroof","Panoramic Roof","Leather Seats","Reverse Camera","360 Camera","Parking Sensors","Cruise Control","Adaptive Cruise","Bluetooth","Apple CarPlay","Android Auto","Navigation","Keyless Entry","Push Start","Heated Seats","Ventilated Seats","Air Conditioning","Safety features"]),field("video_url","ڤیدیۆ / Video URL","text")],
 supermarket:[field("brand","مارکە / Brand","text"),field("product_category","بەشی بەرهەم / Category","select",["خواردن / Food","خواردنەوە / Drinks","شیر / Dairy","برنج / Rice","ڕۆن / Oil","شەکر / Sugar","ئارد / Flour","مۆڵک / Spices","کنسەرڤ / Canned","شۆربا / Soup","Snack","پاککردنەوە / Cleaning","منداڵان / Baby","Personal Care","Diapers","بەرهەمی ماڵ / Home","Fresh / Cake"],true),field("subcategory","بەشی لاوەکی / Subcategory","text"),field("quantity","دانە / Quantity","number"),field("unit","یەکە / Unit","select",["دانە / Piece","کیلۆ / Kg","گرام / Gram","لیتر / Liter","پاکەت / Pack","کارتۆن / Carton","بوتڵ / Bottle","بۆکس / Box","کێسە / Bag","Other"],true),field("weight","کێش / Weight","number"),field("volume","قەبارە / Volume","number"),field("package_size","قەبارەی پاکەت / Package size","text"),field("production_date","بەرواری بەرهەمهێنان / Production date","date"),field("expiry_date","بەرواری بەسەرچوون / Expiry date","date"),field("baby_gender","ڕەگەزی منداڵ / Baby gender","select",["Boy","Girl","Unisex"]),field("diaper_size","قەبارەی Diaper","select",["1","2","3","4","5","6"]),field("ingredients","پێکهاتەکان / Ingredients","textarea")],
 beauty:[field("brand","مارکە / Brand","text"),field("beauty_category","جۆری جوانکاری / Beauty category","select",["Makeup","Skincare","Haircare","Perfume","Shampoo","Cream","Lotion","Foundation","Lipstick","Mascara","Eyeliner","Nail Products","Hair Products","Men's Grooming","Women's Beauty","Accessories"],true),field("subcategory","بەشی لاوەکی / Subcategory","text"),field("skin_type","جۆری پێست / Skin type","select",["Dry","Oily","Combination","Normal","Sensitive"]),field("hair_type","جۆری قژ / Hair type","text"),field("shade","سێد / Shade or color","text"),field("size_volume","قەبارە / Size or volume","text"),field("weight","کێش / Weight","text"),field("ingredients","پێکهاتەکان / Ingredients","textarea"),field("manufacturer","بەرهەمهێنەر / Manufacturer","text"),field("country_origin","وڵاتی بەرهەمهێنان / Country of origin","text"),field("production_date","بەرواری بەرهەمهێنان / Production date","date"),field("expiry_date","بەرواری بەسەرچوون / Expiry date","date"),field("video_url","ڤیدیۆ / Video URL","text")],
 restaurant:[field("restaurant","چێشتخانە / Restaurant","text",undefined,true),field("food_category","بەشی خواردن / Food category","text",undefined,true),field("food_name","ناوی خواردن / Food name","text",undefined,true),field("size","قەبارە / Size","multi",["Small","Medium","Large"]),field("size_prices","نرخی Small/Medium/Large","text"),field("ingredients","پێکهاتەکان / Ingredients","textarea"),field("calories","کالۆری / Calories","number"),field("spicy_level","ئاستی توندی / Spicy level","select",["None","Mild","Medium","Hot"]),field("availability","بەردەستبوون / Availability","select",["Available","Out of stock"]),field("preparation_time","کاتی ئامادەکردن / Preparation minutes","number"),field("discount","داشکاندن % / Discount","number"),field("video_url","ڤیدیۆ / Video URL","text")]
};
const DEFAULT_PRODUCTS: Product[] = [
  {
    id: "demo-1",
    name: "کەباب بێخال / Bikhal Kebab",
    description: "کەبابی بەتام و گۆشتی تازەی بەرخ بە شێوازی کوردی",
    category: "restaurant",
    price: 12000,
    emoji: "🥙",
    owner: "چێشتخانەی بێخال",
    ownerId: null,
    status: "active",
    attributes: { restaurant: "بێخال", food_category: "کەباب", spicy_level: "Mild" }
  },
  {
    id: "demo-2",
    name: "پیتزا مارگەریتا / Margherita Pizza",
    description: "پیتزای ئیتاڵی بە پەنیری موزارێلا و سۆسی تەماتە",
    category: "restaurant",
    price: 8500,
    emoji: "🍕",
    owner: "پیتزا هاوس",
    ownerId: null,
    status: "active",
    attributes: { restaurant: "پیتزا هاوس", food_category: "پیتزا" }
  },
  {
    id: "demo-3",
    name: "برنجی مەحمود ٥ کگم / Mahmood Rice 5kg",
    description: "برنجی پلە یەک بۆ ژەمی خێزانی",
    category: "supermarket",
    price: 14000,
    emoji: "🌾",
    owner: "سوپەرمارکێتی هەولێر",
    ownerId: null,
    status: "active",
    attributes: { brand: "مەحمود", product_category: "برنج", weight: 5, unit: "کیلۆ / Kg" }
  },
  {
    id: "demo-4",
    name: "زەیتی زەیتون ١ لیتر / Olive Oil 1L",
    description: "زەیتی زەیتونی سروشتی خۆماڵی",
    category: "supermarket",
    price: 9000,
    emoji: "🫒",
    owner: "سوپەرمارکێتی هەولێر",
    ownerId: null,
    status: "active",
    attributes: { brand: "سروشت", product_category: "ڕۆن", volume: 1, unit: "لیتر / Liter" }
  },
  {
    id: "demo-5",
    name: "کراسی پیاوانە / Men's Shirt",
    description: "کراسی قوماشی ئەسڵی ١٠٠٪ لۆکە",
    category: "fashion",
    price: 25000,
    emoji: "👔",
    owner: "فاشن ستۆر",
    ownerId: null,
    status: "active",
    attributes: { gender: "پیاوان / Men", clothing_type: "کراس / Shirt", colors: ["ڕەش / Black", "سپی / White"], size: ["M", "L", "XL"] }
  },
  {
    id: "demo-6",
    name: "سیرۆمی دەموچاو / Skincare Serum",
    description: "سیرۆمی هیدرۆنیك ئاسید بۆ شێدارکردنەوەی پێست",
    category: "beauty",
    price: 18000,
    emoji: "✨",
    owner: "بیوتی زۆن",
    ownerId: null,
    status: "active",
    attributes: { brand: "Glow", beauty_category: "Skincare", skin_type: "All" }
  },
  {
    id: "demo-7",
    name: "تۆیۆتا کامری 2023 / Toyota Camry 2023",
    description: "تۆیۆتا کامری سفر کیلۆمەتر، گێڕ ئۆتۆماتیک، بێ بۆیاخ",
    category: "car_dealer",
    price: 32500000,
    emoji: "🚗",
    owner: "پێشانگای هەولێر بۆ ئۆتۆمبێل",
    ownerId: null,
    status: "active",
    attributes: { make: "Toyota", model: "Camry", model_year: 2023, condition: "New", fuel: "Petrol", vehicle_type: "Sedan" }
  }
];

function readableAuthError(error:unknown,t:(a:string,b:string,c:string)=>string){
 const message=typeof error==="object"&&error!==null&&"message" in error?String((error as {message?:unknown}).message||""):String(error||"");
 if(!message||message==="[object Object]"||message==="{}")return t("هەڵەیەک ڕوویدا. تکایە دواتر هەوڵ بدەرەوە.","حدث خطأ. حاول مرة أخرى.","Something went wrong. Please try again.");
 if(message.toLowerCase().includes("email not confirmed"))return t("ئیمەیڵەکەت پشتڕاست نەکراوەتەوە. inbox و spam ـەکەت بپشکنە.","لم يتم تأكيد بريدك الإلكتروني. تحقق من inbox و spam.","Your email is not confirmed. Check your inbox and spam folder.");
 if(message.toLowerCase().includes("invalid login credentials"))return t("ئیمەیڵ یان وشەی نهێنی هەڵەیە.","البريد الإلكتروني أو كلمة المرور غير صحيحة.","The email or password is incorrect.");
 if(message.toLowerCase().includes("user already registered"))return t("ئەم ئیمەیڵە پێشتر هەژماری هەیە.","هذا البريد الإلكتروني مسجل مسبقاً.","This email is already registered.");
 return message;
}

function getAuthRedirectUrl(){
  if(typeof window === "undefined")return "http://localhost:5173";
  return window.location.origin || "http://localhost:5173";
}

function App(){
 const [lang,setLang]=useState<"ku"|"ar"|"en">("ku");
 const [role,setRole]=useState<Role>("customer");
 const [tab,setTab]=useState("home");
 const [search,setSearch]=useState("");
 const [category,setCategory]=useState("restaurant");
 const [cart,setCart]=useState<Product[]>([]);
 const [products,setProducts]=useState<Product[]>([]);
 const [walletTransactions,setWalletTransactions]=useState<WalletTransaction[]>([]);
 const [walletLoading,setWalletLoading]=useState(false);
 const [userId,setUserId]=useState<string|null>(null);
 const [profile,setProfile]=useState<UserProfile|null>(null);
 const [profileBusy,setProfileBusy]=useState(false);
 const [profileMessage,setProfileMessage]=useState("");
 const [loading,setLoading]=useState(isSupabaseConfigured);
 const [authMode,setAuthMode]=useState<"login"|"signup"|"forgot"|"reset">("login");
 const [authEmail,setAuthEmail]=useState("");
 const [authPassword,setAuthPassword]=useState("");
 const [authConfirmPassword,setAuthConfirmPassword]=useState("");
 const [authName,setAuthName]=useState("");
 const [authBusy,setAuthBusy]=useState(false);
 const [authMessage,setAuthMessage]=useState("");
 const [installPrompt,setInstallPrompt]=useState<any>(null);
 const [updateReady,setUpdateReady]=useState(false);
 const [showMenu,setShowMenu]=useState(false);
 const [notice,setNotice]=useState("");
 const [form,setForm]=useState({id:"",name:"",price:"",category:"restaurant",description:"",emoji:"📦",images:"",attributes:{} as Record<string,unknown>});
 const t=(ku:string,ar:string,en:string)=>lang==="ku"?ku:lang==="ar"?ar:en;
 useEffect(()=>{void loadData()},[]);
 useEffect(()=>{
  if(!supabase)return;
  const {data}=supabase.auth.onAuthStateChange(event=>{
   if(event==="PASSWORD_RECOVERY"){setAuthMode("reset");setTab("auth");setAuthMessage("")}
  });
  return()=>{data.subscription.unsubscribe()};
 },[]);
 useEffect(()=>{
  if(tab!=="auth")return;
  const form=document.querySelector<HTMLElement>(".auth-form");
  if(!form)return;
  const passwordInputs=Array.from(form.querySelectorAll<HTMLInputElement>("input[type=password]"));
  const wrappers:HTMLElement[]=[];
  passwordInputs.forEach(input=>{
   if(input.parentElement?.classList.contains("password-field"))return;
   const wrapper=document.createElement("div");
   wrapper.className="password-field";
   input.parentElement?.insertBefore(wrapper,input);
   wrapper.appendChild(input);
   const toggle=document.createElement("button");
   toggle.type="button";toggle.className="password-toggle";toggle.textContent="◉";
   toggle.setAttribute("aria-label","Show or hide password");
   toggle.addEventListener("click",()=>{const shown=input.type==="text";input.type=shown?"password":"text";toggle.textContent=shown?"◉":"○";});
   wrapper.appendChild(toggle);wrappers.push(wrapper);
  });
  const submitButton=form.querySelector<HTMLButtonElement>(".auth-submit");
  let terms:HTMLInputElement|null=null;
  let termsLabel:HTMLLabelElement|null=null;
  let submitHandler:((event:MouseEvent)=>void)|null=null;
  if(authMode==="signup"&&submitButton&&!form.querySelector("#auth-terms")){
   terms=document.createElement("input");terms.type="checkbox";terms.id="auth-terms";terms.required=true;
  termsLabel=document.createElement("label");termsLabel.className="terms-field";
  const termsText=document.createTextNode(t("مەرج و یاساکان قبوڵ دەکەم ","أوافق على الشروط والأحكام ","I accept the terms and conditions "));
  const privacyLink=document.createElement("a");privacyLink.href="https://daim-post.online/privacy-policy.html";privacyLink.target="_blank";privacyLink.rel="noopener noreferrer";privacyLink.textContent=t("سیاسەتی تایبەتمەندی","سياسة الخصوصية","Privacy policy");
  termsLabel.append(terms,termsText,privacyLink);
   submitButton.before(termsLabel);
   submitHandler=event=>{if(!terms?.checked){event.preventDefault();event.stopImmediatePropagation();setAuthMessage(t("پێویستە مەرج و یاساکان قبوڵ بکەیت","يجب الموافقة على الشروط والأحكام","You must accept the terms and conditions"));}};
   submitButton.addEventListener("click",submitHandler,true);
  }
  return()=>{
   if(submitButton&&submitHandler)submitButton.removeEventListener("click",submitHandler,true);
   termsLabel?.remove();
   wrappers.forEach(wrapper=>{const input=wrapper.querySelector("input");if(input)wrapper.replaceWith(input);});
  };
 },[tab,authMode,lang]);
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
  if(!supabase){setProducts(DEFAULT_PRODUCTS);setLoading(false);return;}
  try {
    const {data:sessionData}=await supabase.auth.getSession().catch(()=>({data:{session:null}}));
    const session=sessionData?.session;
    setUserId(session?.user.id??null);
    if(!session?.user){setProfile(null);setRole("customer");}
    if(session?.user.id) await loadWallet(session.user.id);
    if(session?.user.id){
      try {
        const {data:profileData}=await supabase.from("profiles").select("id,full_name,phone,role").eq("id",session.user.id).maybeSingle();
        const profileRole=profileData?.role as Role|undefined;
        if(profileData?.id&&profileRole&&(roles.some(item=>item.id===profileRole)||profileRole==="super_admin"||profileRole==="admin")){
         setRole(profileRole);
         setProfile({id:profileData.id,full_name:profileData.full_name||session.user.user_metadata?.full_name||session.user.email?.split("@")[0]||"User",phone:profileData.phone||"",role:profileRole,email:session.user.email||""});
        }else setProfile({id:session.user.id,full_name:session.user.user_metadata?.full_name||session.user.email?.split("@")[0]||"User",phone:"",role:"customer",email:session.user.email||""});
      } catch (profileErr) {
        console.warn("Profile fetch error:", profileErr);
      }
    }
    const query=supabase.from("posts").select("id,user_id,title,content,category,price,status,image_url,images,attributes,created_at").eq("status","active").order("created_at",{ascending:false});
    const {data,error}=await query;
    if(error){
      console.warn("Supabase posts load notice:", error.message);
      setProducts(DEFAULT_PRODUCTS);
    } else if(data && data.length > 0){
      setProducts(data.map((post:any)=>({id:post.id,name:post.title,description:post.content||"",category:post.category,price:Number(post.price),emoji:post.image_url||"📦",ownerId:post.user_id||null,owner:"SHAKH SUPER",status:post.status,attributes:{...(post.attributes||{}),images:post.images||[]}})));
    } else {
      setProducts(DEFAULT_PRODUCTS);
    }
  } catch (err) {
    console.warn("Data loading error:", err);
    setProducts(DEFAULT_PRODUCTS);
  } finally {
    setLoading(false);
  }
 }
 async function loadWallet(currentUserId:string){
  if(!supabase)return;
  setWalletLoading(true);
  try {
    const {data,error}=await supabase.from("wallet_transactions").select("id,type,amount,status,reference_id,created_at,note").eq("user_id",currentUserId).order("created_at",{ascending:false});
    if(error){console.warn("Supabase wallet load error",error);setWalletTransactions([])}
    else setWalletTransactions((data||[]).map((item:any)=>({...item,type:item.type||"transaction",amount:Number(item.amount||0)})));
  } catch (err) {
    console.warn("Wallet load error:", err);
    setWalletTransactions([]);
  } finally {
    setWalletLoading(false);
  }
 }
 async function authenticate(){
  if(!supabase){setAuthMessage(t("پەیوەندی Supabase ڕێک نەخراوە","لم يتم إعداد اتصال Supabase","Supabase is not configured"));return;}
  if(authMode==="forgot"){await sendReset();return;}
  if(authMode==="reset"){await updatePassword();return;}
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(authEmail.trim())){setAuthMessage(t("تکایە ئیمەیڵێکی دروست بنووسە","أدخل بريداً إلكترونياً صحيحاً","Enter a valid email address"));return;}
  if(!authPassword){setAuthMessage(t("وشەی نهێنی پێویستە","كلمة المرور مطلوبة","Password is required"));return;}
  if(authMode==="signup"&&authPassword.length<8){setAuthMessage(t("وشەی نهێنی دەبێت لانیکەم ٨ پیت بێت","يجب أن تتكون كلمة المرور من 8 أحرف على الأقل","Password must be at least 8 characters"));return;}
  if(authMode==="signup" && !authName.trim()){setAuthMessage(t("ناوی تەواو پێویستە","الاسم الكامل مطلوب","Full name is required"));return;}
    setAuthBusy(true);setAuthMessage("");
    const redirectTo=getAuthRedirectUrl();
    const result=authMode==="signup"
    ?await supabase.auth.signUp({email:authEmail.trim(),password:authPassword,options:{data:{full_name:authName.trim()||authEmail.split("@")[0]},emailRedirectTo:redirectTo}})
     :await supabase.auth.signInWithPassword({email:authEmail.trim(),password:authPassword});
    if(result.error){
      console.error("Supabase authentication error",{
        message:result.error.message,
        code:result.error.code,
        status:result.error.status,
        name:result.error.name,
        details:result.error
      });
      setAuthMessage(readableAuthError(result.error,t));setAuthBusy(false);return;
    }
    if(authMode==="signup"&&!result.data.session){setAuthMessage(t("ئیمەیڵەکەت پشتڕاست بکەرەوە، پاشان بچۆ ژوورەوە","تحقق من بريدك الإلكتروني ثم سجل الدخول","Check your email, then sign in"));}
    else {setAuthMessage("");await loadData();setTab("home");}
    setAuthBusy(false);
 }
 async function handleGoogleSignIn(){
  if(!supabase){setAuthMessage(t("پەیوەندی Supabase ڕێک نەخراوە","لم يتم إعداد اتصال Supabase","Supabase is not configured"));return;}
  setAuthBusy(true);setAuthMessage("");
  const {error}=await supabase.auth.signInWithOAuth({
    provider:"google",
    options:{
      redirectTo:getAuthRedirectUrl(),
      queryParams:{access_type:"offline",prompt:"consent"}
    }
  });
  if(error){
    console.error("Supabase Google auth error",error);
    setAuthMessage(readableAuthError(error,t));
  }
  setAuthBusy(false);
 }
   async function sendReset(){
    if(!supabase){setAuthMessage(t("پەیوەندی Supabase ڕێک نەخراوە","لم يتم إعداد اتصال Supabase","Supabase is not configured"));return;}
    if(!authEmail){setAuthMessage(t("تکایە ئیمەیڵەکەت بنووسە","أدخل بريدك الإلكتروني","Enter your email address"));return;}
    setAuthBusy(true);setAuthMessage("");
    const {error}=await supabase.auth.resetPasswordForEmail(authEmail.trim(),{redirectTo:getAuthRedirectUrl()});
    setAuthMessage(error?readableAuthError(error,t):t("لینکی گۆڕینی وشەی نهێنی بۆ ئیمەیڵەکەت نێردرا. inbox ـەکەت بپشکنە.","تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك.","A password reset link was sent to your email."));
    setAuthBusy(false);
   }
    async function resendConfirmation(){
     if(!supabase||!authEmail){setAuthMessage(t("ئیمەیڵەکەت بنووسە بۆ دووبارە ناردنەوەی پشتڕاستکردنەوە.","أدخل بريدك لإعادة إرسال رسالة التأكيد.","Enter your email to resend the confirmation email."));return;}
     setAuthBusy(true);setAuthMessage("");
     const {error}=await supabase.auth.resend({type:"signup",email:authEmail});
     setAuthMessage(error?readableAuthError(error,t):t("ئیمەیڵی پشتڕاستکردنەوە دووبارە نێردرا.","تمت إعادة إرسال رسالة التأكيد.","The confirmation email was resent."));
     setAuthBusy(false);
    }
   async function updatePassword(){
    if(!supabase)return;
    if(authPassword.length<8){setAuthMessage(t("وشەی نهێنی دەبێت لانیکەم ٨ پیت بێت","يجب أن تتكون كلمة المرور من 8 أحرف على الأقل","Password must be at least 8 characters"));return;}
    if(authPassword!==authConfirmPassword){setAuthMessage(t("وشە نهێنییەکان یەکسان نین","كلمتا المرور غير متطابقتين","Passwords do not match"));return;}
    setAuthBusy(true);setAuthMessage("");
    const {error}=await supabase.auth.updateUser({password:authPassword});
    if(error)setAuthMessage(readableAuthError(error,t));
    else {setAuthMode("login");setAuthPassword("");setAuthConfirmPassword("");setAuthMessage(t("وشەی نهێنی نوێ کرایەوە. ئێستا دەتوانیت بچیتە ژوورەوە.","تم تحديث كلمة المرور. يمكنك تسجيل الدخول الآن.","Password updated. You can sign in now."));}
    setAuthBusy(false);
   }
 async function signOut(){if(supabase)await supabase.auth.signOut();setUserId(null);setProfile(null);setRole("customer");setTab("home");}
 async function updateProfile(fullName:string,phone:string){
  if(!supabase||!profile)return;
  setProfileBusy(true);setProfileMessage("");
  const {error}=await supabase.from("profiles").update({full_name:fullName.trim(),phone:phone.trim()}).eq("id",profile.id);
  if(error)setProfileMessage(error.message);
  else {setProfile({...profile,full_name:fullName.trim()||profile.full_name,phone:phone.trim()});setProfileMessage(t("پرۆفایلەکە نوێکرایەوە","تم تحديث الملف الشخصي","Profile updated"));}
  setProfileBusy(false);
 }
 async function installApp(){if(!installPrompt)return;await installPrompt.prompt();setInstallPrompt(null);}
 function refreshApp(){navigator.serviceWorker?.controller?.postMessage({type:"SKIP_WAITING"});window.location.reload();}
 const visible=useMemo(()=>{
  const term=search.trim().toLocaleLowerCase();
  return products.filter(p=>{
   if(category!=="all"&&p.category!==category)return false;
   if(p.status!=="active")return false;
   if(!term)return true;
   const searchable=[p.name,p.description,p.category,p.owner,...Object.values(p.attributes).flatMap(value=>Array.isArray(value)?value:[value])].join(" ").toLocaleLowerCase();
   return searchable.includes(term);
  });
 },[products,category,search]);
 const money=(n:number)=>new Intl.NumberFormat("en-US").format(n)+" د.ع";
 async function savePost(){
  const fields=categorySchemas[form.category]||[];
  const missing=fields.filter(item=>item.required&&(!form.attributes[item.key]||(Array.isArray(form.attributes[item.key])&&!(form.attributes[item.key] as unknown[]).length))).map(item=>item.label);
  if(!form.name||!form.price){setNotice(t("ناو و نرخ پێویستن","الاسم والسعر مطلوبان","Name and price are required"));return;}
  if(missing.length){setNotice(t(`ئەم خانانە پێویستن: ${missing.join(", ")}`,`الحقول المطلوبة: ${missing.join(", ")}`,`Required fields: ${missing.join(", ")}`));return;}
  if(!supabase){setNotice(t("سیستەم بەردەست نییە","النظام غير متاح","System unavailable"));return;}

  // Authenticate user via Supabase server-side validation to avoid stale state
  const { data: { user }, error: userAuthError } = await supabase.auth.getUser();
  if (userAuthError || !user?.id) {
    setNotice(t("بۆ پۆستکردن دەبێت بچیتە ژوورەوە","يجب تسجيل الدخول للنشر","Sign in to publish a post"));
    return;
  }
  const verifiedUserId = user.id;

  const allowedCategories = getAllowedPostCategories(profile?.role || role);
  if (!allowedCategories.includes(form.category) && profile?.role !== "super_admin" && profile?.role !== "admin") {
    setNotice(t("تەنها دەتوانیت لەو بەشە پۆست بکەیت کە لە دەسەڵاتی ڕۆڵەکەت دایە","يمكنك النشر فقط في القسم المسموح لدورك","You can only publish in the category allowed for your role"));
    return;
  }
  const images=form.images.split(/[\n,]/).map(item=>item.trim()).filter(Boolean).slice(0,8);
  const payload={title:form.name,content:form.description,category:form.category,price:+form.price,image_url:images[0]||form.emoji||null,images,attributes:form.attributes};
  const request=form.id
    ? supabase.from("posts").update(payload).eq("id",form.id).eq("user_id",verifiedUserId)
    : supabase.from("posts").insert({...payload,user_id:verifiedUserId});
  const {error}=await request;
  if(error){console.error("Supabase post save error",{message:error.message,code:error.code,details:error.details,hint:error.hint});setNotice(error.message);return;}
  await loadData();setTab("home");setNotice(t(form.id?"پۆستەکە نوێکرایەوە":"پۆستەکە زیاد کرا",form.id?"تم تحديث المنشور":"تمت إضافة المنشور",form.id?"Post updated":"Post added"));setForm({id:"",name:"",price:"",category:allowedCategories[0]||"restaurant",description:"",emoji:"📦",images:"",attributes:{}});
 }
 function editPost(product:Product){setForm({id:product.id,name:product.name,price:String(product.price),category:product.category,description:product.description,emoji:product.emoji,images:Array.isArray(product.attributes.images)?(product.attributes.images as string[]).join("\n"):"",attributes:product.attributes});setTab("post")}
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
 const canPost=Boolean(userId) && (merchantRoles.includes(role)||role==="admin"||role==="super_admin"||role==="customer");
 const canManagePosts=role==="admin"||role==="super_admin";
 const canManageDashboard=canManagePosts;
 const canUseWallet=Boolean(userId);

 async function togglePostStatus(product:Product){
  if(!supabase||!userId||(product.ownerId!==userId&&!canManagePosts)){setNotice(t("دەسەڵاتت نییە بۆ ئەم کردارە","لا تملك صلاحية هذا الإجراء","You are not allowed to perform this action"));return;}
  const nextStatus=product.status==="active"?"blocked":"active";
  const {error}=await supabase.from("posts").update({status:nextStatus}).eq("id",product.id);
  if(error){setNotice(error.message);return;}
  await loadData();
 }
 async function requestPayout(amount:number){
  if(!supabase||!userId||!amount||amount<=0){setNotice(t("بڕی دروست بنووسە","أدخل مبلغاً صحيحاً","Enter a valid amount"));return;}
  const {error}=await supabase.from("wallet_payout_requests").insert({user_id:userId,amount});
  if(error){setNotice(error.message);return;}
  setNotice(t("داواکارییەکەت نێردرا بۆ پشکنینی بەڕێوەبەر","تم إرسال طلب السحب للمراجعة","Withdrawal request submitted for review"));
 }
 return <div className="app">
  <header className="topbar">
   <button className="iconbtn mobile" onClick={()=>setShowMenu(!showMenu)}>{showMenu?<X/>:<Menu/>}</button>
   <div className="brand" onClick={()=>{setTab("home");setCategory("all")}}><div className="brandmark">S</div><div><b>SHAKH <span>SUPER</span></b><small>{t("هەموو شتێک لە یەک شوێن","كل ما تحتاجه في مكان واحد","Everything in one place")}</small></div></div>
   <div className="search"><Search size={18}/><input placeholder={t("گەڕان بۆ کالا، چێشتخانە، ئۆتۆمبێل...","ابحث عن منتج أو سيارة...","Search products, restaurants, cars...")} value={search} onChange={e=>setSearch(e.target.value)}/></div>
    <div className="actions"><button className="lang" onClick={()=>setLang(lang==="ku"?"ar":lang==="ar"?"en":"ku")}><Languages size={17}/>{lang.toUpperCase()}</button><button className="cart" onClick={()=>setTab("cart")}><ShoppingCart size={19}/><span>{cart.length}</span></button>{userId?<button className="avatar" onClick={()=>setTab("profile")} title={t("پرۆفایل","الملف الشخصي","Profile")}><UserRound size={19}/></button>:<button className="avatar" onClick={()=>setTab("auth")} title={t("چوونەژوورەوە","تسجيل الدخول","Sign in")}><UserRound size={19}/></button>}</div>
    {profile&&<div className="user-profile"><div className="profile-avatar"><UserRound size={17}/></div><div><strong>{t("بەخێربێیتەوە","مرحباً","Welcome")}, {profile.full_name}</strong><small>{profile.email} · {roleLabel(profile.role,t)}</small></div></div>}
    </header>
  <div className={"layout "+(showMenu?"open":"")}>
   <aside className="sidebar">
    <div className="side-title">{t("بەشەکان","الأقسام","Categories")}</div>
    <button className={category==="all"?"active":""} onClick={()=>{setCategory("all");setTab("home")}}>{<LayoutDashboard/>}{t("هەموو بەشەکان","كل الأقسام","All categories")}</button>
    {roles.map(r=><button key={r.id} className={category===r.id?"active":""} onClick={()=>{setCategory(r.id);setTab("home");setShowMenu(false)}}>{r.icon}<span>{t(r.ku,r.ar,r.en)}</span></button>)}
    <div className="side-title">{t("بەڕێوەبردن","الإدارة","Management")}</div>
    {canManageDashboard&&<button onClick={()=>setTab("dashboard")}><ShieldCheck/>{t("داشبۆرد","لوحة التحكم","Dashboard")}</button>}
    {canUseWallet&&<button onClick={()=>setTab("wallet")}><Wallet/>{t("جزدان و مامەڵەکان","المحفظة والمعاملات","Wallet")}</button>}
    {canPost&&<button onClick={()=>setTab("post")}><Plus/>{t("پۆستی نوێ","منشور جديد","New post")}</button>}
   </aside>
  <main className="main">
   {installPrompt&&<div className="notice">{t("ئەپەکە دابەزێنە بۆ ئەزموونی خێراتر","ثبّت التطبيق لتجربة أسرع","Install the app for a faster experience")}<button onClick={installApp}>{t("دابەزاندن","تثبيت","Install")}</button></div>}
   {updateReady&&<div className="notice">{t("نوێکردنەوەی نوێ بەردەستە؛ پەڕەکە نوێ بکەرەوە","تحديث جديد متاح؛ أعد فتح التطبيق","A new update is ready; reopen the app")}<button onClick={refreshApp}>{t("نوێکردنەوە","تحديث","Update")}</button></div>}
    <section className="hero"><div><div className="eyebrow">SHAKH SUPER</div><h1>{t("بەخێربێیت بۆ پلاتفۆرمی شاخ","مرحباً بكم في منصة شاخ","Welcome to Shakh platform")}</h1><p>{t("پلاتفۆرمی شاخ لە خزمەت ئێوەی خۆشەویستە بۆ پێداویستییە ڕۆژانەکانتان؛ خواردنی چێشتخانە، مارکێت، پاککەرەوە و هەموو ئەو شتانەی پێویستن.","منصة شاخ في خدمتكم لتلبية احتياجاتكم اليومية؛ طعام المطاعم، السوبرماركت، مواد التنظيف وكل ما تحتاجونه.","Shakh platform is here to serve your daily needs with restaurant food, supermarket goods, cleaning supplies and everything you need.")}</p><button onClick={()=>setCategory("all")}>{t("دەستپێبکە","ابدأ الآن","Start exploring")} <span>←</span></button></div><div className="hero-art">🛍️<div>🍔 🛒 🧴 🧺</div></div></section>
    {notice&&<div className="notice">{notice}<button onClick={()=>setNotice("")}>×</button></div>}
    {loading?<div className="panel"><p>{t("داتاکان بار دەکرێن...","جار تحميل البيانات...","Loading data...")}</p></div>:tab==="auth"?<Auth mode={authMode} setMode={setAuthMode} email={authEmail} setEmail={setAuthEmail} password={authPassword} setPassword={setAuthPassword} name={authName} setName={setAuthName} busy={authBusy} message={authMessage} submit={authenticate} t={t} googleSignIn={handleGoogleSignIn}/>:tab==="cart"?<Cart cart={cart} setCart={setCart} money={money} t={t} checkout={checkout}/>:tab==="post"?(!userId ? <AuthRequired setTab={setTab} t={t} /> : <Post form={form} setForm={setForm} save={savePost} userRole={profile?.role || role} setTab={setTab} t={t} />):tab==="profile" ? (profile ? <Profile profile={profile} busy={profileBusy} message={profileMessage} save={updateProfile} signOut={signOut} t={t} /> : <Auth mode={authMode} setMode={setAuthMode} email={authEmail} setEmail={setAuthEmail} password={authPassword} setPassword={setAuthPassword} name={authName} setName={setAuthName} busy={authBusy} message={authMessage} submit={authenticate} t={t} googleSignIn={handleGoogleSignIn} />):tab==="dashboard"?<Dashboard products={products} role={role} setRole={setRole} t={t}/>:tab==="wallet"?<WalletView money={money} t={t}/>:<><div className="section-head"><div><h2>{t("پۆستە نوێکان","المنشورات الجديدة","Latest posts")}</h2><p>{t("بەرهەمەکانت هەڵبژێرە و داواکاری بکە","اختر منتجاتك واطلب الآن","Choose products and order now")}</p></div><div className="role-select"><UserRound size={16}/><select value={role} onChange={e=>setRole(e.target.value as Role)}><option value="customer">{t("کڕیار","عميل","Customer")}</option>{roles.map(r=><option value={r.id} key={r.id}>{t(r.ku,r.ar,r.en)}</option>)}<option value="super_admin">Super Admin</option></select></div></div><div className="chips"><button className={category==="all"?"selected":""} onClick={()=>setCategory("all")}>{t("هەموو","الكل","All")}</button>{roles.map(r=><button className={category===r.id?"selected":""} onClick={()=>setCategory(r.id)} key={r.id}>{t(r.ku,r.ar,r.en)}</button>)}</div><div className="grid">{visible.map(p=><article className="card" key={p.id}><div className="product-image">{p.emoji}<span className="badge">{p.category==="car_dealer"?t("فرۆشتنی ئۆتۆمبێل","سيارة للبيع","For sale"):t("بەردەستە","متوفر","Available")}</span></div><div className="card-body"><small>{p.owner}</small><h3>{p.name}</h3><div className="price">{money(p.price)}</div><button className="add" onClick={()=>buy(p)}><Plus size={17}/>{t("زیادکردن بۆ سەبەتە","أضف للسلة","Add to cart")}</button>{p.ownerId===userId&&<button className="iconbtn" onClick={()=>editPost(p)} title={t("دەستکاری","تعديل","Edit")}>✎</button>}</div></article>)}</div></>}
   </main>
  </div>
  <footer>{t("© شاخ سوپەر — پلاتفۆرمی فرۆشتن و گەیاندن","© شاخ سوبر — منصة التسوق والتوصيل","© Shakh Super — Marketplace & delivery platform")} <span>کوردی · عربي · English</span></footer>
 </div>
}
function AuthRequired({ setTab, t }: { setTab: (t: string) => void; t: (a: string, b: string, c: string) => string }) {
  return (
    <div className="auth-required-panel">
      <div className="auth-required-icon">
        <Lock size={32} />
      </div>
      <h2>{t("چوونەژوورەوە پێویستە", "يلزم تسجيل الدخول", "Sign in required")}</h2>
      <p>
        {t(
          "هیچ کەس ناتوانێت پۆست بکات یان پەڕەی پۆستکردن ببینێت پێش چوونە ژوورەوە. تکایە سەرەتا بچۆ ژوورەوە بۆ دروستکردنی پۆستی نوێ.",
          "لا يمكن لأي شخص رؤية صفحة النشر أو النشر قبل تسجيل الدخول. يرجى تسجيل الدخول أولاً لإنشاء منشور جديد.",
          "No one can view or create posts before signing in. Please sign in first to create a new post."
        )}
      </p>
      <button className="primary" onClick={() => setTab("auth")}>
        <UserRound size={18} />
        {t("چوونەژوورەوە / دروستکردنی هەژمار", "تسجيل الدخول / إنشاء حساب", "Sign in / Create account")}
      </button>
    </div>
  );
}

function Auth({
  mode,
  setMode,
  email,
  setEmail,
  password,
  setPassword,
  name,
  setName,
  busy,
  message,
  submit,
  t,
  googleSignIn
}: {
  mode: "login" | "signup" | "forgot" | "reset";
  setMode: React.Dispatch<React.SetStateAction<"login" | "signup" | "forgot" | "reset">>;
  email: string;
  setEmail: React.Dispatch<React.SetStateAction<string>>;
  password: string;
  setPassword: React.Dispatch<React.SetStateAction<string>>;
  name: string;
  setName: React.Dispatch<React.SetStateAction<string>>;
  busy: boolean;
  message: string;
  submit: () => void;
  t: (a: string, b: string, c: string) => string;
  googleSignIn: () => void;
}) {
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [localMessage, setLocalMessage] = useState("");
  const [signupRole, setSignupRole] = useState<Role>("customer");

  const recovery = mode === "forgot" || mode === "reset";
  const title =
    mode === "login"
      ? t("بەخێربێیتەوە", "مرحباً بعودتك", "Welcome back")
      : mode === "signup"
      ? t("هەژمارێکی نوێ دروست بکە", "أنشئ حساباً جديداً", "Create your account")
      : mode === "forgot"
      ? t("وشەی نهێنیت لەبیرچووە؟", "نسيت كلمة المرور؟", "Forgot your password?")
      : t("وشەی نهێنی نوێ دابنێ", "أنشئ كلمة مرور جديدة", "Create a new password");

  const submitForm = () => {
    if (mode === "reset" && password !== confirmPassword) {
      setLocalMessage(t("وشە نهێنییەکان یەکسان نین", "كلمتا المرور غير متطابقتين", "Passwords do not match"));
      return;
    }
    setLocalMessage("");
    submit();
  };

  return (
    <div className="auth-panel">
      <div className="auth-intro">
        <div className="auth-orbit">S</div>
        <span>SHAKH SUPER</span>
        <h2>{title}</h2>
        <p>
          {recovery
            ? t(
                "ئێمە یارمەتیت دەدەین بۆ گەڕاندنەوەی دەستگەیشتن بە هەژمارەکەت.",
                "سنساعدك على استعادة الوصول إلى حسابك.",
                "We will help you recover access to your account."
              )
            : t("پلاتفۆرمی بازاڕکردن و بەڕێوەبردنی فرۆشگاکەت بە شێوەیەکی بەرز.", "أدر متجرك وسوقك بسلاسة وبأمان.", "Manage your store and marketplace smoothly and safely.")}
        </p>
      </div>

      <div className="auth-form">
        {!recovery && (
          <div className="auth-mode-switch">
            <button
              type="button"
              className={`auth-mode-btn ${mode === "login" ? "active" : ""}`}
              onClick={() => {
                setMode("login");
                setLocalMessage("");
              }}
            >
              {t("چوونەژوورەوە", "تسجيل الدخول", "Sign In")}
            </button>
            <button
              type="button"
              className={`auth-mode-btn ${mode === "signup" ? "active" : ""}`}
              onClick={() => {
                setMode("signup");
                setLocalMessage("");
              }}
            >
              {t("دروستکردنی هەژمار", "حساب جديد", "Sign Up")}
            </button>
          </div>
        )}

        {mode === "signup" && (
          <>
            <div className="field-group">
              <label>{t("ناوی تەواو", "الاسم الكامل", "Full Name")}</label>
              <input
                className="field-input"
                placeholder={t("ناوت بنووسە...", "أدخل اسمك الكامل...", "Enter your full name...")}
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>

            <div className="field-group">
              <label>{t("جۆری هەژمار (ڕۆڵ)", "نوع الحساب", "Account Type (Role)")}</label>
              <select
                className="field-select"
                value={signupRole}
                onChange={e => setSignupRole(e.target.value as Role)}
              >
                <option value="customer">{t("کڕیار / هەژماری ئاسایی", "عميل / حساب عادي", "Customer / Standard User")}</option>
                <option value="restaurant">{t("خاوەنی چێشتخانە", "صاحب مطعم", "Restaurant Merchant")}</option>
                <option value="supermarket">{t("خاوەنی سوپەرمارکێت", "صاحب سوبرماركت", "Supermarket Merchant")}</option>
                <option value="fashion">{t("فرۆشیاری جل و بەرگ", "تاجر أزياء", "Fashion Merchant")}</option>
                <option value="beauty">{t("فرۆشیاری جوانکاری", "محل تجميل", "Beauty Merchant")}</option>
                <option value="car_dealer">{t("فرۆشیاری ئۆتۆمبێل", "معرض سيارات", "Car Dealer")}</option>
                <option value="captain">{t("گەیاندکار / کاپتن", "مندوب توصيل", "Delivery Captain")}</option>
              </select>
            </div>
          </>
        )}

        <div className="field-group">
          <label>{t("ئیمەیڵ", "البريد الإلكتروني", "Email Address")}</label>
          <input
            className="field-input"
            type="email"
            autoComplete="email"
            placeholder="name@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
        </div>

        {mode !== "forgot" && (
          <div className="field-group">
            <label>{t("وشەی نهێنی", "كلمة المرور", "Password")}</label>
            <div className="password-input-wrapper">
              <input
                className="field-input"
                type={showPassword ? "text" : "password"}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="password-eye-btn"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? t("شاردنەوە", "إخفاء", "Hide") : t("نیشاندان", "إظهار", "Show")}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        )}

        {mode === "reset" && (
          <div className="field-group">
            <label>{t("دووبارەکردنەوەی وشەی نهێنی", "تأكيد كلمة المرور", "Confirm Password")}</label>
            <input
              className="field-input"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
            />
          </div>
        )}

        {mode !== "reset" && mode !== "forgot" && (
          <button type="button" className="google-btn" onClick={googleSignIn} disabled={busy}>
            <svg className="google-icon" viewBox="0 0 24 24" style={{ verticalAlign: "middle" }}>
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            {t("بە گۆگڵ بچۆ ژوورەوە", "تسجيل الدخول عبر Google", "Continue with Google")}
          </button>
        )}

        {(message || localMessage) && (
          <p className="auth-message">{localMessage || message}</p>
        )}

        <button
          type="button"
          className="primary auth-submit"
          disabled={busy || !email || (mode !== "forgot" && !password)}
          onClick={submitForm}
        >
          {busy
            ? t("چاوەڕوان بە...", "انتظر...", "Please wait...")
            : mode === "login"
            ? t("چوونەژوورەوە", "تسجيل الدخول", "Sign In")
            : mode === "signup"
            ? t("دروستکردنی هەژمار", "إنشاء حساب", "Create Account")
            : mode === "forgot"
            ? t("ناردنی لینکی گۆڕین", "إرسال رابط الاستعادة", "Send Reset Link")
            : t("نوێکردنەوەی وشەی نهێنی", "تحديث كلمة المرور", "Update Password")}
        </button>

        {mode === "login" && (
          <button
            type="button"
            className="forgot-link"
            onClick={() => {
              setMode("forgot");
              setLocalMessage("");
            }}
          >
            {t("وشەی نهێنیت لەبیرچووە؟", "نسيت كلمة المرور؟", "Forgot password?")}
          </button>
        )}
      </div>
    </div>
  );
}

function Cart({cart,setCart,money,t,checkout}:{cart:Product[];setCart:React.Dispatch<React.SetStateAction<Product[]>>;money:(n:number)=>string;t:(a:string,b:string,c:string)=>string;checkout:()=>void}){const total=cart.reduce((s,p)=>s+p.price,0);return <div className="panel"><h2>{t("سەبەتەی کڕین","سلة التسوق","Shopping cart")}</h2>{cart.length===0?<p>{t("سەبەتەکە بەتاڵە","السلة فارغة","Your cart is empty")}</p>:<>{cart.map((p,i)=><div className="cartrow" key={`${p.id}-${i}`}><span>{p.emoji} {p.name}</span><b>{money(p.price)}</b><button onClick={()=>setCart(c=>c.filter((_,j)=>j!==i))}><Trash2 size={16}/></button></div>)}<div className="total">{t("کۆی گشتی","المجموع","Total")} <b>{money(total)}</b></div><button className="primary" onClick={checkout}>{t("داواکاری بە کاش لە کاتی گەیاندن","الدفع نقداً عند الاستلام","Cash on delivery")} ✓</button></>}</div>}

function Profile({
  profile,
  busy,
  message,
  save,
  signOut,
  t
}: {
  profile: UserProfile;
  busy: boolean;
  message: string;
  save: (fullName: string, phone: string) => void;
  signOut: () => void;
  t: (a: string, b: string, c: string) => string;
}) {
  const [fullName, setFullName] = useState(profile.full_name);
  const [phone, setPhone] = useState(profile.phone);
  const [copiedId, setCopiedId] = useState(false);

  const allowedCategories = getAllowedPostCategories(profile.role);

  const categoryNames: Record<string, { ku: string; ar: string; en: string }> = {
    restaurant: { ku: "چێشتخانە", ar: "مطعم", en: "Restaurant" },
    supermarket: { ku: "سوپەرمارکێت", ar: "سوبرماركت", en: "Supermarket" },
    fashion: { ku: "جل و بەرگ", ar: "أزياء", en: "Fashion" },
    beauty: { ku: "جوانکاری", ar: "تجميل", en: "Beauty" },
    car_dealer: { ku: "ئۆتۆمبێل", ar: "سيارات", en: "Car Dealer" }
  };

  const copyUserId = () => {
    navigator.clipboard.writeText(profile.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  return (
    <div className="profile-page">
      <div className="profile-hero">
        <div className="profile-large-avatar">
          <UserRound size={36} />
        </div>
        <div>
          <p className="profile-eyebrow">SHAKH SUPER</p>
          <h2>
            {t("بەخێربێیتەوە", "مرحباً", "Welcome")}, {profile.full_name}
          </h2>
          <div className="profile-hero-badge">
            <ShieldCheck size={14} />
            <span>{roleLabel(profile.role, t)}</span>
          </div>
        </div>
      </div>

      <div className="profile-grid">
        <section className="panel profile-card">
          <h3>{t("زانیاری هەژمار", "معلومات الحساب", "Account Information")}</h3>

          <div className="field-group">
            <label>{t("ناوی تەواو", "الاسم الكامل", "Full Name")}</label>
            <input
              className="field-input"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
            />
          </div>

          <div className="field-group">
            <label>{t("ژمارەی مۆبایل", "رقم الهاتف", "Phone Number")}</label>
            <input
              className="field-input"
              placeholder="0750 XXX XX XX"
              value={phone}
              onChange={e => setPhone(e.target.value)}
            />
          </div>

          <div className="field-group">
            <label>{t("ئیمەیڵ (ڕێگەپێدراو)", "البريد الإلكتروني", "Email Address")}</label>
            <input className="field-input" value={profile.email} readOnly />
          </div>

          <button
            className="primary"
            disabled={busy}
            onClick={() => save(fullName, phone)}
            style={{ marginTop: 12 }}
          >
            {busy ? t("چاوەڕوان بە...", "جار الحفظ...", "Saving...") : t("نوێکردنەوەی پرۆفایل", "تحديث الملف الشخصي", "Update Profile")}
          </button>

          {message && <p className="profile-message">{message}</p>}
        </section>

        <section className="panel profile-card">
          <h3>{t("ڕۆڵ و دەسەڵاتی پۆستکردن", "الدور وصلاحيات النشر", "Role & Posting Permissions")}</h3>

          <div className="profile-detail">
            <span>{t("ڕۆڵی هەژمار", "دور الحساب", "Account Role")}</span>
            <strong>{roleLabel(profile.role, t)}</strong>
          </div>

          <div className="profile-detail">
            <span>{t("ناسنامەی بەکارهێنەر (ID)", "معرف المستخدم", "User ID")}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <code>{profile.id.slice(0, 10)}...</code>
              <button className="copy-btn" onClick={copyUserId}>
                {copiedId ? <Check size={12} color="#16a34a" /> : <Copy size={12} />}
                {copiedId ? t("کۆپی کرا", "تم النسخ", "Copied") : t("کۆپی", "نسخ", "Copy")}
              </button>
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#475569" }}>
              {t("بەشە ڕێگەپێدراوەکان بۆ پۆستکردن:", "الأقسام المسموحة للنشر:", "Permitted Posting Categories:")}
            </span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
              {allowedCategories.map(cat => {
                const meta = categoryNames[cat];
                return (
                  <span
                    key={cat}
                    style={{
                      padding: "5px 10px",
                      background: "#fff5ee",
                      border: "1px solid #fed7aa",
                      borderRadius: "16px",
                      fontSize: "11px",
                      fontWeight: 700,
                      color: "#c2410c",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4
                    }}
                  >
                    <Check size={12} />
                    {t(meta?.ku || cat, meta?.ar || cat, meta?.en || cat)}
                  </span>
                );
              })}
            </div>
          </div>

          <div className="profile-role-note" style={{ marginTop: 16 }}>
            {profile.role === "super_admin" || profile.role === "admin"
              ? t("هەموو تایبەتمەندی و بەشەکان بێ سنوور بەردەستن.", "جميع الميزات والأقسام متاحة بدون قيود.", "All features and categories are fully unlocked.")
              : t("پۆستکردن تەنها لەو بەشە ڕێگەپێدراوە کە تایبەت کراوە بە جۆری هەژمارەکەت.", "النشر متاح فقط في القسم المحدد المخصص لنوع حسابك.", "Posting is restricted strictly to the category assigned to your role.")}
          </div>
        </section>
      </div>

      <div className="profile-signout">
        <button className="signout-button" onClick={signOut}>
          {t("دەرچوون لە هەژمار", "تسجيل الخروج", "Sign Out")}
        </button>
      </div>
    </div>
  );
}

function Post({
  form,
  setForm,
  save,
  userRole,
  setTab,
  t
}: {
  form: any;
  setForm: any;
  save: () => void;
  userRole: Role;
  setTab: (t: string) => void;
  t: (a: string, b: string, c: string) => string;
}) {
  const allowedCategories = useMemo(() => getAllowedPostCategories(userRole), [userRole]);
  const isLockedCategory = allowedCategories.length === 1;

  useEffect(() => {
    if (allowedCategories.length > 0 && !allowedCategories.includes(form.category)) {
      setForm((prev: any) => ({ ...prev, category: allowedCategories[0], attributes: {} }));
    }
  }, [allowedCategories, form.category, setForm]);

  const fields = categorySchemas[form.category] || [];

  const updateAttr = (key: string, value: unknown) => {
    setForm((prev: any) => ({
      ...prev,
      attributes: { ...prev.attributes, [key]: value }
    }));
  };

  const toggleMultiAttr = (key: string, option: string) => {
    const current = Array.isArray(form.attributes[key]) ? (form.attributes[key] as string[]) : [];
    const next = current.includes(option)
      ? current.filter(item => item !== option)
      : [...current, option];
    updateAttr(key, next);
  };

  const imageList = useMemo(() => {
    if (!form.images) return [];
    return form.images
      .split(/[\n,]/)
      .map((item: string) => item.trim())
      .filter((item: string) => item.startsWith("http://") || item.startsWith("https://"));
  }, [form.images]);

  const categoryIcons: Record<string, { icon: React.ReactNode; emoji: string; ku: string; ar: string; en: string }> = {
    restaurant: { icon: <Utensils size={22} />, emoji: "🥙", ku: "چێشتخانە", ar: "مطعم", en: "Restaurant" },
    supermarket: { icon: <Store size={22} />, emoji: "🛒", ku: "سوپەرمارکێت", ar: "سوبرماركت", en: "Supermarket" },
    fashion: { icon: <Shirt size={22} />, emoji: "👔", ku: "جل و بەرگ", ar: "أزياء", en: "Fashion" },
    beauty: { icon: <Sparkles size={22} />, emoji: "✨", ku: "جوانکاری", ar: "تجميل", en: "Beauty" },
    car_dealer: { icon: <CarFront size={22} />, emoji: "🚗", ku: "ئۆتۆمبێل", ar: "سيارات", en: "Car Dealer" }
  };

  return (
    <div className="post-container">
      <div className="post-hero">
        <div className="post-hero-text">
          <h2>
            <Plus size={24} />
            {t(
              form.id ? "دەستکاری پۆست" : "پۆستی نوێ زیاد بکە",
              form.id ? "تعديل المنشور" : "إضافة منشور جديد",
              form.id ? "Edit Post" : "Create New Post"
            )}
          </h2>
          <p>
            {t(
              "بەرهەمەکەت بڵاوبکەرەوە بە تایبەتمەندی و وێنەی باوڕپێکراو بۆ سەرنجڕاکێشانی زیاتری کڕیاران.",
              "أنشئ منشورك واعرض منتجاتك بالصور والخصائص الكاملة لجذب العملاء.",
              "Publish your product with detailed specs and images to attract more customers."
            )}
          </p>
        </div>
        <div className="post-role-badge">
          <ShieldCheck size={16} />
          <span>{roleLabel(userRole, t)}</span>
        </div>
      </div>

      <div className="post-card">
        <h3 className="post-card-title">
          <Store size={18} />
          {t("دیاریکردنی بەشی پۆست", "تحديد قسم المنشور", "Select Post Category")}
        </h3>
        {isLockedCategory ? (
          <div className="locked-category-banner">
            <Lock size={18} />
            <span>
              {t(
                `بەپێی ڕۆڵی هەژمارەکەت (${roleLabel(userRole, t)})، تەنها دەتوانیت لە بەشی [${t(
                  categoryIcons[form.category]?.ku || form.category,
                  categoryIcons[form.category]?.ar || form.category,
                  categoryIcons[form.category]?.en || form.category
                )}] پۆست بکەیت.`,
                `حسب دور حسابك (${roleLabel(userRole, t)})، يمكنك النشر فقط في قسم [${t(
                  categoryIcons[form.category]?.ku || form.category,
                  categoryIcons[form.category]?.ar || form.category,
                  categoryIcons[form.category]?.en || form.category
                )}].`,
                `Based on your role (${roleLabel(userRole, t)}), you can only publish in [${t(
                  categoryIcons[form.category]?.ku || form.category,
                  categoryIcons[form.category]?.ar || form.category,
                  categoryIcons[form.category]?.en || form.category
                )}].`
              )}
            </span>
          </div>
        ) : (
          <div className="category-picker-grid">
            {allowedCategories.map(cat => {
              const meta = categoryIcons[cat];
              const active = form.category === cat;
              return (
                <div
                  key={cat}
                  className={`category-picker-card ${active ? "active" : ""}`}
                  onClick={() => setForm({ ...form, category: cat, attributes: {}, emoji: meta?.emoji || "📦" })}
                >
                  <span className="category-picker-icon">{meta?.emoji || "📦"}</span>
                  <span>{t(meta?.ku || cat, meta?.ar || cat, meta?.en || cat)}</span>
                  {active && <Check size={14} color="#f97316" />}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="post-card">
        <h3 className="post-card-title">
          <Package size={18} />
          {t("زانیاری سەرەکی کاڵا", "المعلومات الأساسية للمنتج", "Basic Product Information")}
        </h3>

        <div className="field-grid">
          <div className="field-group">
            <label>
              {t("ناوی بەرهەم یان کاڵا", "اسم المنتج", "Product Name")} <span className="required">*</span>
            </label>
            <input
              className="field-input"
              required
              placeholder={t("نموونە: پیتزای پێپیرۆنی گەورە", "مثال: بيتزا ببروني كبيرة", "e.g. Large Pepperoni Pizza")}
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
            />
          </div>

          <div className="field-group">
            <label>
              {t("نرخ بە دیناری عێراقی (IQD)", "السعر بالدينار العراقي", "Price in IQD")}{" "}
              <span className="required">*</span>
            </label>
            <input
              className="field-input"
              required
              type="number"
              min="0"
              placeholder={t("نموونە: 12500", "مثال: 12500", "e.g. 12500")}
              value={form.price}
              onChange={e => setForm({ ...form, price: e.target.value })}
            />
            {form.price && Number(form.price) > 0 && (
              <small style={{ color: "#16a34a", fontWeight: 700, fontSize: "11px" }}>
                ✓ {Number(form.price).toLocaleString()} IQD
              </small>
            )}
          </div>
        </div>

        <div className="field-group">
          <label>{t("وەسف و زانیاری زیاتر", "الوصف والتفاصيل", "Description & Details")}</label>
          <textarea
            className="field-textarea"
            rows={3}
            placeholder={t(
              "وەسفێکی ورد بنووسە لەسەر پێکهاتە، جۆر، مەرجەکان یان گەرەنتی کاڵاکە...",
              "اكتب وصفاً مفصلاً عن المكونات أو المواصفات والضمان...",
              "Write a detailed description about ingredients, specs or warranty..."
            )}
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
          />
        </div>
      </div>

      {fields.length > 0 && (
        <div className="post-card">
          <h3 className="post-card-title">
            <Sparkles size={18} />
            {t("تایبەتمەندی تایبەت بەم بەشە", "خصائص هذا القسم", "Category-specific Attributes")}
          </h3>

          <div className="field-grid">
            {fields.map(item => {
              const val = form.attributes[item.key];
              return (
                <div className="field-group" key={item.key}>
                  <label>
                    {item.label} {item.required && <span className="required">*</span>}
                  </label>

                  {item.type === "select" ? (
                    <select
                      className="field-select"
                      value={String(val || "")}
                      onChange={e => updateAttr(item.key, e.target.value)}
                    >
                      <option value="">{t("-- هەڵبژێرە --", "-- اختر --", "-- Select --")}</option>
                      {item.options?.map(opt => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : item.type === "multi" ? (
                    <div className="multi-chips-container">
                      {item.options?.map(opt => {
                        const isSelected = Array.isArray(val) && (val as string[]).includes(opt);
                        return (
                          <button
                            type="button"
                            key={opt}
                            className={`multi-chip ${isSelected ? "selected" : ""}`}
                            onClick={() => toggleMultiAttr(item.key, opt)}
                          >
                            {isSelected && <Check size={12} style={{ display: "inline", marginLeft: 4 }} />}
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  ) : item.type === "textarea" ? (
                    <textarea
                      className="field-textarea"
                      rows={2}
                      value={String(val || "")}
                      onChange={e => updateAttr(item.key, e.target.value)}
                    />
                  ) : (
                    <input
                      className="field-input"
                      type={item.type || "text"}
                      value={String(val || "")}
                      onChange={e => updateAttr(item.key, e.target.value)}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="post-card">
        <h3 className="post-card-title">
          <ImageIcon size={18} />
          {t("وێنەکانی بەرهەم و پێشبینین (Preview)", "صور المنتج والمعاينة", "Product Images & Preview")}
        </h3>

        <div className="field-group">
          <label>
            {t("لینکی وێنەکان (هەر دێڕێک یەک لینک، تا ٨ وێنە)", "روابط الصور (رابط في كل سطر، حتى 8)", "Image URLs (one link per line, up to 8)")}
          </label>
          <textarea
            className="field-textarea"
            rows={3}
            placeholder="https://images.unsplash.com/photo-1513104890138-7c749659a591
https://images.unsplash.com/photo-1565299624946-b28f40a0ae38"
            value={form.images}
            onChange={e => setForm({ ...form, images: e.target.value })}
          />
        </div>

        {imageList.length > 0 && (
          <div className="image-preview-gallery">
            {imageList.map((url: string, index: number) => (
              <div className="image-preview-card" key={index}>
                <img
                  src={url}
                  alt={`Preview ${index + 1}`}
                  onError={e => {
                    (e.target as HTMLImageElement).src =
                      "https://placehold.co/200x200/f97316/ffffff?text=Image+Error";
                  }}
                />
                <span className="preview-number">#{index + 1}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="post-action-bar">
        <button type="button" className="iconbtn" onClick={() => setTab("home")}>
          {t("پاشگەزبوونەوە", "إلغاء", "Cancel")}
        </button>
        <button type="button" className="primary post-submit-btn" onClick={save}>
          <Plus size={18} />
          {form.id
            ? t("پاشەکەوتکردنی گۆڕانکارییەکان", "حفظ التعديلات", "Save Changes")
            : t("بڵاوکردنەوەی پۆستەکە", "نشر المنشور", "Publish Post")}
        </button>
      </div>
    </div>
  );
}
function Dashboard({products,role,t}:{products:Product[];role:Role;setRole:any;t:(a:string,b:string,c:string)=>string}){return <AdminConsole productsCount={products.length} role={role} t={t}/>}
function LegacyDashboard({products,role,t}:{products:Product[];role:Role;setRole:any;t:(a:string,b:string,c:string)=>string}){
 if(role!=="admin"&&role!=="super_admin")return <AccessDenied t={t}/>;
 const permissions=[
  ["manage_users","بەڕێوەبردنی بەکارهێنەران","إدارة المستخدمين","Manage users"],
  ["manage_posts","بەڕێوەبردنی هەموو پۆستەکان","إدارة جميع المنشورات","Manage all posts"],
  ["create_posts","درووستکردنی پۆست","إنشاء المنشورات","Create posts"],
  ["manage_assigned_sections","بەڕێوەبردنی بەشەکان","إدارة الأقسام","Manage sections"],
  ["manage_orders","بەڕێوەبردنی داواکارییەکان","إدارة الطلبات","Manage orders"],
  ["create_orders","درووستکردنی داواکاری","إنشاء الطلبات","Create orders"],
  ["manage_wallet","بەڕێوەبردنی جزدان و پارە","إدارة المحفظة والأموال","Manage wallet and funds"],
  ["manage_payouts","پشکنینی داواکارییەکانی پارەدانەوە","مراجعة طلبات السحب","Review payout requests"],
  ["request_payout","ناردنی داواکاری پارەدانەوە","إرسال طلب سحب","Request payout"],
  ["manage_settings","گۆڕینی ڕێکخستنەکانی پلاتفۆرم","تعديل إعدادات المنصة","Manage platform settings"],
  ["view_audit_logs","بینینی تۆماری چاودێری","عرض سجل التدقيق","View audit logs"],
  ["manage_permissions","بەڕێوەبردنی دەسەڵاتەکان","إدارة الصلاحيات","Manage permissions"],
  ["create_car_posts","درووستکردنی پۆستی ئۆتۆمبێل","إنشاء إعلانات السيارات","Create car posts"],
  ["manage_own_posts","بەڕێوەبردنی پۆستەکانی خۆت","إدارة المنشورات الخاصة","Manage own posts"],
  ["manage_own_deliveries","بەڕێوەبردنی گەیاندنەکانی خۆت","إدارة عمليات التوصيل الخاصة","Manage own deliveries"],
  ["create_captain","زیادکردنی گەیاندکار","إضافة مندوب توصيل","Create captains"],
  ["view_active_posts","بینینی پۆستە چالاکەکان","عرض المنشورات النشطة","View active posts"],
  ["manage_storage","بەڕێوەبردنی وێنە و فایلەکان","إدارة الصور والملفات","Manage images and files"]
 ] as const;
 return <div className="panel"><div className="section-head"><div><h2>{t("داشبۆردی بەڕێوەبردن","لوحة التحكم","Management dashboard")}</h2><p>{roleLabel(role,t)}</p></div><ShieldCheck/></div><div className="stats"><div><Package/><b>{products.length}</b><span>{t("پۆستەکانی بارکراو","المنشورات المحملة","Loaded posts")}</span></div><div><ShieldCheck/><b>{role==="super_admin"?"*":permissions.length}</b><span>{t("دەسەڵاتەکان","الصلاحيات","Permissions")}</span></div></div>{role==="super_admin"&&<div className="admin-banner"><strong>{t("سوپەر ئەدمین: هەموو دەسەڵاتەکان چالاکن","المشرف العام: جميع الصلاحيات مفعلة","Super admin: all permissions enabled")}</strong><span>{t("دەسەڵاتی * واتە دەستگەیشتن بە هەموو بەش و کردارەکانی پلاتفۆرم.","صلاحية * تعني الوصول إلى جميع أقسام وإجراءات المنصة.","The * permission grants access to every platform section and action.")}</span></div>}<div className="permission-list"><h3>{t("لیستی دەسەڵاتەکان","قائمة الصلاحيات","Permission list")}</h3>{permissions.map(([permission,ku,ar,en])=><div className="permission-row" key={permission}><ShieldCheck size={17}/><span>{t(ku,ar,en)}</span><code>{role==="super_admin"?"*":permission}</code></div>)}</div><p>{t("دەسەڵات و داتا لە Supabase و RLS ـەوە کۆنترۆڵ دەکرێن.","الصلاحيات والبيانات تدار عبر Supabase و RLS.","Permissions and data are controlled by Supabase and RLS.")}</p></div>}
function AccessDenied({t}:{t:(a:string,b:string,c:string)=>string}){return <div className="panel"><h2>{t("دەسەڵاتت نییە","لا تملك الصلاحية","Access denied")}</h2><p>{t("ئەم کردارە بۆ ڕۆڵەکەت ڕێگەپێنەدراوە.","هذا الإجراء غير مسموح لدورك.","This action is not allowed for your role.")}</p></div>}
function WalletView({role="customer",transactions=[],loading=false,money,requestPayout=async amount=>{if(!supabase)return;const {data}=await supabase.auth.getSession();if(data.session)await supabase.from("wallet_payout_requests").insert({user_id:data.session.user.id,amount});},t}:{role?:Role;transactions?:WalletTransaction[];loading?:boolean;money:(n:number)=>string;requestPayout?:(amount:number)=>void;t:(a:string,b:string,c:string)=>string}){const [amount,setAmount]=useState("");const [localTransactions,setLocalTransactions]=useState<WalletTransaction[]>([]);const [localLoading,setLocalLoading]=useState(false);useEffect(()=>{if(transactions.length||!supabase)return;let mounted=true;setLocalLoading(true);void supabase.from("wallet_transactions").select("id,type,kind,amount,status,reference_id,created_at,note").order("created_at",{ascending:false}).then(({data})=>{if(mounted)setLocalTransactions((data||[]).map((item:any)=>({...item,type:item.type||item.kind||"transaction",amount:Number(item.amount||0)})));if(mounted)setLocalLoading(false)});return()=>{mounted=false}},[transactions.length]);const displayedTransactions=transactions.length?transactions:localTransactions;const displayedLoading=loading||localLoading;const balance=displayedTransactions.reduce((total,item)=>total+item.amount,0);const canRequestPayout=role==="captain"||merchantRoles.includes(role);return <div className="panel"><div className="section-head"><div><h2>{t("جزدان و مامەڵەکان","المحفظة والمعاملات","Wallet & transactions")}</h2><p>{roleLabel(role,t)}</p></div><strong className="price">{money(balance)}</strong></div><div className="stats"><div><Wallet/><b>{money(balance)}</b><span>{t("باڵانسی بەردەست","الرصيد الحالي","Current balance")}</span></div><div><Package/><b>{displayedTransactions.length}</b><span>{t("تۆماری مامەڵەکان","سجل المعاملات","Transaction records")}</span></div></div>{canRequestPayout&&<div className="wallet-action"><input type="number" min="1" placeholder={t("بڕی دەرکردن","مبلغ السحب","Withdrawal amount")} value={amount} onChange={e=>setAmount(e.target.value)}/><button className="primary" onClick={()=>requestPayout(Number(amount))}>{t("داواکاری دەرکردن","طلب سحب","Request withdrawal")}</button></div>}<h3>{t("مێژووی مامەڵەکان","سجل المعاملات","Transaction log")}</h3>{displayedLoading?<p>{t("بارکردن...","جار التحميل...","Loading...")}</p>:displayedTransactions.length===0?<p>{t("هیچ مامەڵەیەک نییە","لا توجد معاملات بعد","No transactions yet")}</p>:<div className="transaction-list">{displayedTransactions.map(item=><div className="transaction" key={item.id}><span><b>{item.type}</b><small>{new Date(item.created_at).toLocaleString()}</small></span><strong className={item.amount<0?"negative":"positive"}>{money(item.amount)}</strong><em>{item.status}</em></div>)}</div>}</div>}
createRoot(document.getElementById("root")!).render(<App/>);