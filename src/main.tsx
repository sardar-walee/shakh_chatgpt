import React, {useEffect, useMemo, useState} from "react";
import {createRoot} from "react-dom/client";
import {ShoppingCart, Search, UserRound, Bike, Store, Utensils, Shirt, Sparkles, CarFront, ShieldCheck, Plus, Trash2, LayoutDashboard, Wallet, Package, Languages, Menu, X, Eye, EyeOff, UploadCloud, ImagePlus, Camera} from "lucide-react";
import {isSupabaseConfigured, supabase} from "./lib/supabase";
import {mapConfig, storageBucket} from "./lib/platform";
import AdminConsole from "./components/AdminConsole";
import "./styles.css";

type Role="super_admin"|"admin"|"captain"|"restaurant"|"supermarket"|"fashion"|"beauty"|"car_dealer"|"customer";
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
const merchantRoles: Role[]=["restaurant","supermarket","fashion","beauty","car_dealer"];
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
  if(!supabase){setLoading(false);return;}
  const {data:sessionData}=await supabase.auth.getSession();
    const session=sessionData.session;
  setUserId(session?.user.id??null);
  if(!session?.user){setProfile(null);setRole("customer");}
    if(session?.user.id) await loadWallet(session.user.id);
    if(session?.user.id){
      const {data:profileData}=await supabase.from("profiles").select("id,full_name,phone,role").eq("id",session.user.id).maybeSingle();
      const profileRole=profileData?.role as Role|undefined;
      if(profileData?.id&&profileRole&&(roles.some(item=>item.id===profileRole)||profileRole==="super_admin"||profileRole==="admin")){
       setRole(profileRole);
       setProfile({id:profileData.id,full_name:profileData.full_name||session.user.user_metadata?.full_name||session.user.email?.split("@")[0]||"User",phone:profileData.phone||"",role:profileRole,email:session.user.email||""});
      }else setProfile({id:session.user.id,full_name:session.user.user_metadata?.full_name||session.user.email?.split("@")[0]||"User",phone:"",role:"customer",email:session.user.email||""});
    }
    const query=supabase.from("posts").select("id,user_id,title,content,category,price,status,image_url,images,attributes,created_at").eq("status","active").order("created_at",{ascending:false});
    const {data,error}=await query;
    if(error){console.error("Supabase posts load error",error);setNotice(error.message)}
    if(!error&&data){setProducts(data.map((post:any)=>({id:post.id,name:post.title,description:post.content||"",category:post.category,price:Number(post.price),emoji:post.image_url||"📦",ownerId:post.user_id||null,owner:(post.user_id===userId&&role==="super_admin")?"SHAKH STORE":"SHAKH SUPER",status:post.status,attributes:{...(post.attributes||{}),images:post.images||[]}})))}
  setLoading(false);
 }
 async function loadWallet(currentUserId:string){
  if(!supabase)return;
  setWalletLoading(true);
  const {data,error}=await supabase.from("wallet_transactions").select("id,type,amount,status,reference_id,created_at,note").eq("user_id",currentUserId).order("created_at",{ascending:false});
  if(error){console.error("Supabase wallet load error",error);setWalletTransactions([])}
  else setWalletTransactions((data||[]).map((item:any)=>({...item,type:item.type||"transaction",amount:Number(item.amount||0)})));
  setWalletLoading(false);
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
  if(!supabase||!userId){setNotice(t("بۆ پۆستکردن دەبێت هەژمارت هەبێت و بچیتە ژوورەوە","يجب إنشاء حساب وتسجيل الدخول للنشر","Create an account and sign in before publishing"));setTab("auth");return;}
  if(!allowedPostCategories.includes(form.category as Role)){setNotice(t("ئەم بەشە بۆ ڕۆڵی هەژمارەکەت ڕێگەپێدراو نییە","هذا القسم غير مسموح لدور حسابك","This category is not allowed for your account role"));return;}
  const images=form.images.split(/[\n,]/).map(item=>item.trim()).filter(Boolean).slice(0,8);
  const payload={title:form.name,content:form.description,category:form.category,price:+form.price,image_url:images[0]||form.emoji||null,images,attributes:form.attributes,status:"active"};
  const request=form.id?supabase.from("posts").update(payload).eq("id",form.id).eq("user_id",userId):supabase.from("posts").insert({...payload,user_id:userId});
  const {error}=await request;
  if(error){console.error("Supabase post save error",{message:error.message,code:error.code,details:error.details,hint:error.hint});setNotice(error.message);return;}
  await loadData();setTab("home");setNotice(t(form.id?"پۆستەکە نوێکرایەوە":"پۆستەکە زیاد کرا",form.id?"تم تحديث المنشور":"تمت إضافة المنشور",form.id?"Post updated":"Post added"));setForm({id:"",name:"",price:"",category:"restaurant",description:"",emoji:"📦",images:"",attributes:{}});
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
 const allowedPostCategories: Role[]=role==="super_admin"||role==="admin"?["restaurant","supermarket","fashion","beauty","car_dealer"]:merchantRoles.includes(role)?[role]:role==="customer"?["car_dealer"]:[];
 const canPost=Boolean(userId)&&allowedPostCategories.length>0;
 const canManagePosts=role==="admin"||role==="super_admin";
 const canManageDashboard=canManagePosts;
 const canUseWallet=Boolean(userId);
 if(tab==="profile"&&profile)return <Profile profile={profile} busy={profileBusy} message={profileMessage} save={updateProfile} signOut={signOut} t={t}/>;
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
    {canPost&&<button onClick={()=>{setForm(f=>({...f,category:allowedPostCategories[0],attributes:{}}));setTab("post")}}><Plus/>{t("پۆستی نوێ","منشور جديد","New post")}</button>}
    {!userId&&<button onClick={()=>{setAuthMode("signup");setTab("auth");setShowMenu(false)}}><UserRound/>{t("هەژمار دروست بکە","أنشئ حساباً","Create account")}</button>}
   </aside>
  <main className="main">
   {installPrompt&&<div className="notice">{t("ئەپەکە دابەزێنە بۆ ئەزموونی خێراتر","ثبّت التطبيق لتجربة أسرع","Install the app for a faster experience")}<button onClick={installApp}>{t("دابەزاندن","تثبيت","Install")}</button></div>}
   {updateReady&&<div className="notice">{t("نوێکردنەوەی نوێ بەردەستە؛ پەڕەکە نوێ بکەرەوە","تحديث جديد متاح؛ أعد فتح التطبيق","A new update is ready; reopen the app")}<button onClick={refreshApp}>{t("نوێکردنەوە","تحديث","Update")}</button></div>}
    <section className="hero"><div><div className="eyebrow">SHAKH SUPER</div><h1>{t("بەخێربێیت بۆ پلاتفۆرمی شاخ","مرحباً بكم في منصة شاخ","Welcome to Shakh platform")}</h1><p>{t("پلاتفۆرمی شاخ لە خزمەت ئێوەی خۆشەویستە بۆ پێداویستییە ڕۆژانەکانتان؛ خواردنی چێشتخانە، مارکێت، پاککەرەوە و هەموو ئەو شتانەی پێویستن.","منصة شاخ في خدمتكم لتلبية احتياجاتكم اليومية؛ طعام المطاعم، السوبرماركت، مواد التنظيف وكل ما تحتاجونه.","Shakh platform is here to serve your daily needs with restaurant food, supermarket goods, cleaning supplies and everything you need.")}</p><button onClick={()=>setCategory("all")}>{t("دەستپێبکە","ابدأ الآن","Start exploring")} <span>←</span></button></div><div className="hero-art">🛍️<div>🍔 🛒 🧴 🧺</div></div></section>
    {notice&&<div className="notice">{notice}<button onClick={()=>setNotice("")}>×</button></div>}
    {loading?<div className="panel"><p>{t("داتاکان بار دەکرێن...","جار تحميل البيانات...","Loading data...")}</p></div>:tab==="auth"?<Auth mode={authMode} setMode={setAuthMode} email={authEmail} setEmail={setAuthEmail} password={authPassword} setPassword={setAuthPassword} name={authName} setName={setAuthName} busy={authBusy} message={authMessage} submit={authenticate} t={t} googleSignIn={handleGoogleSignIn}/>:tab==="cart"?<Cart cart={cart} setCart={setCart} money={money} t={t} checkout={checkout}/>:tab==="post"?(canPost?<Post form={form} setForm={setForm} save={savePost} allowedCategories={allowedPostCategories} t={t}/>:<Auth mode={authMode} setMode={setAuthMode} email={authEmail} setEmail={setAuthEmail} password={authPassword} setPassword={setAuthPassword} name={authName} setName={setAuthName} busy={authBusy} message={authMessage} submit={authenticate} t={t} googleSignIn={handleGoogleSignIn}/>):tab==="dashboard"?<Dashboard products={products} role={role} setRole={setRole} t={t}/>:tab==="wallet"?<WalletView money={money} t={t}/>:<><div className="section-head"><div><h2>{t("پۆستە نوێکان","المنشورات الجديدة","Latest posts")}</h2><p>{t("بەرهەمەکانت هەڵبژێرە و داواکاری بکە","اختر منتجاتك واطلب الآن","Choose products and order now")}</p></div><div className="role-select"><UserRound size={16}/><span>{profile?roleLabel(profile.role,t):t("کڕیار","عميل","Customer")}</span></div></div><div className="chips"><button className={category==="all"?"selected":""} onClick={()=>setCategory("all")}>{t("هەموو","الكل","All")}</button>{roles.map(r=><button className={category===r.id?"selected":""} onClick={()=>setCategory(r.id)} key={r.id}>{t(r.ku,r.ar,r.en)}</button>)}</div><div className="grid">{visible.map(p=><article className="card" key={p.id}><div className="product-image">{p.emoji}<span className="badge">{p.category==="car_dealer"?t("فرۆشتنی ئۆتۆمبێل","سيارة للبيع","For sale"):t("بەردەستە","متوفر","Available")}</span></div><div className="card-body"><small>{p.owner}</small><h3>{p.name}</h3><div className="price">{money(p.price)}</div><button className="add" onClick={()=>buy(p)}><Plus size={17}/>{t("زیادکردن بۆ سەبەتە","أضف للسلة","Add to cart")}</button>{p.ownerId===userId&&<button className="iconbtn" onClick={()=>editPost(p)} title={t("دەستکاری","تعديل","Edit")}>✎</button>}</div></article>)}</div></>}
   </main>
  </div>
  <footer>{t("© شاخ سوپەر — پلاتفۆرمی فرۆشتن و گەیاندن","© شاخ سوبر — منصة التسوق والتوصيل","© Shakh Super — Marketplace & delivery platform")} <span>کوردی · عربي · English</span></footer>
 </div>
}
function Auth({mode,setMode,email,setEmail,password,setPassword,name,setName,busy,message,submit,t,googleSignIn}:{mode:"login"|"signup"|"forgot"|"reset";setMode:React.Dispatch<React.SetStateAction<"login"|"signup"|"forgot"|"reset">>;email:string;setEmail:React.Dispatch<React.SetStateAction<string>>;password:string;setPassword:React.Dispatch<React.SetStateAction<string>>;name:string;setName:React.Dispatch<React.SetStateAction<string>>;busy:boolean;message:string;submit:()=>void;t:(a:string,b:string,c:string)=>string;googleSignIn:()=>void}){const [confirmPassword,setConfirmPassword]=useState("");const [localMessage,setLocalMessage]=useState("");const recovery=mode==="forgot"||mode==="reset";const title=mode==="login"?t("بەخێربێیتەوە","مرحباً بعودتك","Welcome back"):mode==="signup"?t("هەژمارێکی نوێ دروست بکە","أنشئ حساباً جديداً","Create your account"):mode==="forgot"?t("وشەی نهێنیت لەبیرچووە؟","نسيت كلمة المرور؟","Forgot your password?"):t("وشەی نهێنی نوێ دابنێ","أنشئ كلمة مرور جديدة","Create a new password");const submitForm=()=>{if(mode==="reset"&&password!==confirmPassword){setLocalMessage(t("وشە نهێنییەکان یەکسان نین","كلمتا المرور غير متطابقتين","Passwords do not match"));return;}setLocalMessage("");submit()};return <div className="auth-panel"><div className="auth-intro"><div className="auth-orbit">S</div><span>SHAKH SUPER</span><h2>{title}</h2><p>{recovery?t("ئێمە یارمەتیت دەدەین بۆ گەڕاندنەوەی دەستگەیشتن بە هەژمارەکەت.","سنساعدك على استعادة الوصول إلى حسابك.","We will help you get back into your account."):t("بازاڕەکەت بە ئارامی بەڕێوە ببە.","أدر سوقك بسهولة.","Your marketplace, made simple.")}</p></div><div className="auth-form"><div className="auth-kicker">{mode==="signup"?t("بەشداربوون","انضم إلينا","Join us"):mode==="login"?t("چوونەژوورەوەی پارێزراو","دخول آمن","Secure sign in"):t("پاراستنی هەژمار","حماية الحساب","Account recovery")}</div>{mode==="signup"&&<input placeholder={t("ناوی تەواو","الاسم الكامل","Full name")} value={name} onChange={e=>setName(e.target.value)}/>}<input type="email" autoComplete="email" placeholder={t("ئیمەیڵ","البريد الإلكتروني","Email")} value={email} onChange={e=>setEmail(e.target.value)}/>{mode!=="forgot"&&<input type="password" autoComplete={mode==="login"?"current-password":"new-password"} placeholder={t("وشەی نهێنی","كلمة المرور","Password")} value={password} onChange={e=>setPassword(e.target.value)}/>} {mode==="reset"&&<input type="password" autoComplete="new-password" placeholder={t("دووبارە وشەی نهێنی بنووسە","أعد كتابة كلمة المرور","Confirm password")} value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)}/>} {mode!=="reset"&&mode!=="forgot"&&<button type="button" className="google-btn" onClick={googleSignIn} disabled={busy}>{t("بە گۆگڵ بچۆ ژوورەوە","تسجيل الدخول عبر Google","Continue with Google")}</button>} {(message||localMessage)&&<p className="auth-message">{localMessage||message}</p>}<button className="primary auth-submit" disabled={busy||!email||(mode!=="forgot"&&!password)} onClick={submitForm}>{busy?t("چاوەڕوان بە...","انتظر...","Please wait..."):mode==="login"?t("چوونەژوورەوە","تسجيل الدخول","Sign in"):mode==="signup"?t("دروستکردنی هەژمار","إنشاء حساب","Create account"):mode==="forgot"?t("ناردنی لینکی گۆڕین","إرسال رابط الاستعادة","Send reset link"):t("نوێکردنەوەی وشەی نهێنی","تحديث كلمة المرور","Update password")}</button><button type="button" className="linkbtn auth-back" onClick={()=>setMode(mode==="login"?"signup":"login")}>{mode==="login"?t("هەژمارت نییە؟ دروستی بکە","ليس لديك حساب؟ أنشئ حساباً","Create an account"):mode==="signup"?t("پێشتر هەژمارت هەیە؟ بچۆ ژوورەوە","لديك حساب؟ سجل الدخول","Already have an account? Sign in"):t("گەڕانەوە بۆ چوونەژوورەوە","العودة لتسجيل الدخول","Back to sign in")}</button>{mode==="login"&&<button type="button" className="forgot-link" onClick={()=>{setMode("forgot");setLocalMessage("")}}>{t("وشەی نهێنیت لەبیرچووە؟","نسيت كلمة المرور؟","Forgot password?")}</button>}</div></div>}function Cart({cart,setCart,money,t,checkout}:{cart:Product[];setCart:React.Dispatch<React.SetStateAction<Product[]>>;money:(n:number)=>string;t:(a:string,b:string,c:string)=>string;checkout:()=>void}){const total=cart.reduce((s,p)=>s+p.price,0);return <div className="panel"><h2>{t("سەبەتەی کڕین","سلة التسوق","Shopping cart")}</h2>{cart.length===0?<p>{t("سەبەتەکە بەتاڵە","السلة فارغة","Your cart is empty")}</p>:<>{cart.map((p,i)=><div className="cartrow" key={`${p.id}-${i}`}><span>{p.emoji} {p.name}</span><b>{money(p.price)}</b><button onClick={()=>setCart(c=>c.filter((_,j)=>j!==i))}><Trash2 size={16}/></button></div>)}<div className="total">{t("کۆی گشتی","المجموع","Total")} <b>{money(total)}</b></div><button className="primary" onClick={checkout}>{t("داواکاری بە کاش لە کاتی گەیاندن","الدفع نقداً عند الاستلام","Cash on delivery")} ✓</button></>}</div>}
function Profile({profile,busy,message,save,signOut,t}:{profile:UserProfile;busy:boolean;message:string;save:(fullName:string,phone:string)=>void;signOut:()=>void;t:(a:string,b:string,c:string)=>string}){
 const [fullName,setFullName]=useState(profile.full_name);
 const [phone,setPhone]=useState(profile.phone);
 return <div className="profile-page"><div className="profile-hero"><div className="profile-large-avatar"><UserRound size={34}/></div><div><p className="profile-eyebrow">SHAKH SUPER</p><h2>{t("بەخێربێیتەوە","مرحباً","Welcome")}, {profile.full_name}</h2><p>{t("پرۆفایلی بەکارهێنەر","الملف الشخصي للمستخدم","User profile")}</p></div></div><div className="profile-grid"><section className="panel profile-card"><h3>{t("زانیاری هەژمار","معلومات الحساب","Account information")}</h3><label>{t("ناوی تەواو","الاسم الكامل","Full name")}<input value={fullName} onChange={event=>setFullName(event.target.value)}/></label><label>{t("ژمارەی مۆبایل","رقم الهاتف","Phone number")}<input value={phone} onChange={event=>setPhone(event.target.value)}/></label><label>{t("ئیمەیڵ","البريد الإلكتروني","Email")}<input value={profile.email} readOnly/></label><button className="primary" disabled={busy} onClick={()=>save(fullName,phone)}>{busy?t("چاوەڕوان بە...","جار الحفظ...","Saving..."):t("نوێکردنەوەی پرۆفایل","تحديث الملف الشخصي","Update profile")}</button>{message&&<p className="profile-message">{message}</p>}</section><section className="panel profile-card"><h3>{t("ڕۆڵ و دەسەڵات","الدور والصلاحيات","Role and permissions")}</h3><div className="profile-detail"><span>{t("ڕۆڵ","الدور","Role")}</span><strong>{roleLabel(profile.role,t)}</strong></div><div className="profile-detail"><span>{t("ناسنامەی بەکارهێنەر","معرف المستخدم","User ID")}</span><code>{profile.id}</code></div><div className="profile-role-note">{profile.role==="super_admin"?t("هەموو تایبەتمەندی و دەسەڵاتەکانت چالاکن.","جميع الميزات والصلاحيات مفعلة.","All features and permissions are enabled."):t("تایبەتمەندییەکان بەپێی ڕۆڵی هەژمارەکەت دیاری دەکرێن.","تتحدد الميزات حسب دور حسابك.","Features are determined by your account role.")}</div></section></div><div className="profile-signout"><button className="signout-button" onClick={signOut}>{t("دەرچوون لە هەژمار","تسجيل الخروج","Sign out")}</button></div></div>
}
function Post({form,setForm,save,allowedCategories,t}:{form:any;setForm:any;save:()=>void;allowedCategories:Role[];t:(a:string,b:string,c:string)=>string}){
 const fields=categorySchemas[form.category]||[];
 const [uploading,setUploading]=useState(false);
 const update=(key:string,value:unknown)=>setForm({...form,attributes:{...form.attributes,[key]:value}});
 const selectedRole=roles.find(r=>r.id===form.category);
 const images=String(form.images||"").split(/[\n,]/).map((item:string)=>item.trim()).filter(Boolean).slice(0,8);
 const fieldValue=(key:string)=>form.attributes?.[key];
 const uploadImages=async(event:React.ChangeEvent<HTMLInputElement>)=>{
  if(!supabase||!event.target.files?.length)return;
  setUploading(true);
  try{
   const {data:sessionData}=await supabase.auth.getSession();
   const userId=sessionData.session?.user.id;
   if(!userId)throw new Error(t("تکایە سەرەتا بچۆ ژوورەوە","سجل الدخول أولاً","Please sign in first"));
   const uploaded:string[]=[];
   for(const file of Array.from(event.target.files).slice(0,8-images.length)){
    const extension=file.name.split(".").pop()?.toLowerCase()||"jpg";
    const path=`${userId}/${crypto.randomUUID()}.${extension}`;
    const {error}=await supabase.storage.from(storageBucket).upload(path,file,{contentType:file.type||"image/jpeg",upsert:false});
    if(error)throw error;
    uploaded.push(supabase.storage.from(storageBucket).getPublicUrl(path).data.publicUrl);
   }
   setForm({...form,images:[...images,...uploaded].join("\n")});
  }catch(error){
   window.alert(error instanceof Error?error.message:t("بارکردنی وێنە سەرکەوتوو نەبوو","فشل رفع الصور","Image upload failed"));
  }finally{setUploading(false);event.target.value="";}
 };
 const removeImage=(url:string)=>setForm({...form,images:images.filter((item:string)=>item!==url).join("\n")});
 const renderField=(item:Field)=>{
  const value=fieldValue(item.key);
  return <label className={`post-field ${item.type==='textarea'?'post-field-wide':''}`} key={item.key}>
   <span className="post-field-label">{item.label}{item.required&&<em>*</em>}</span>
   {item.type==="select"?<select value={String(value||"")} onChange={e=>update(item.key,e.target.value)}><option value="">{t("هەڵبژێرە","اختر","Select")}</option>{item.options?.map(option=><option key={option}>{option}</option>)}</select>
    :item.type==="multi"?<select multiple className="post-multi" value={Array.isArray(value)?value as string[]:[]} onChange={e=>update(item.key,Array.from(e.target.selectedOptions).map(option=>option.value))}>{item.options?.map(option=><option key={option}>{option}</option>)}</select>
    :item.type==="textarea"?<textarea rows={4} value={String(value||"")} onChange={e=>update(item.key,e.target.value)} placeholder={t("زانیارییەکان بنووسە...","أدخل التفاصيل...","Enter details...")}/>
    :<input type={item.type} value={String(value||"")} onChange={e=>update(item.key,e.target.value)} placeholder={item.placeholder||""}/>} 
  </label>;
 };
 return <div className="post-editor">
  <div className="post-editor-hero">
   <div>
    <div className="post-kicker">SHAKH SUPER · SELLER STUDIO</div>
    <h2>{t(form.id?"دەستکاری پۆست":"پۆستی نوێ زیاد بکە",form.id?"تعديل المنشور":"إضافة منشور جديد",form.id?"Edit post":"Create new post")}</h2>
    <p>{t("پۆستێکی جوان و تەواو دروست بکە و بەکارهێنەر بە یەکەم نیگاکە سەرنجی پێبدە.","أنشئ منشوراً احترافياً واجذب انتباه العملاء من النظرة الأولى.","Create a polished listing designed to capture attention from the first glance.")}</p>
   </div>
   <div className="post-hero-mark">✦</div>
  </div>

  <div className="post-layout">
   <div className="post-form-column">
    <section className="post-card">
     <div className="post-section-head"><div className="post-step">01</div><div><h3>{t("زانیاری سەرەکی","المعلومات الأساسية","Basic information")}</h3><p>{t("ناو، نرخ و بەشی پۆستەکە دیاری بکە.","حدد الاسم والسعر والقسم.","Set the name, price and category.")}</p></div></div>
     <div className="post-grid two">
      <label className="post-field post-field-wide"><span className="post-field-label">{t("ناوی بەرهەم","اسم المنتج","Product name")}<em>*</em></span><input required value={form.name} onChange={e=>setForm({...form,name:e.target.value,attributes:form.category==="restaurant"?{...form.attributes,food_name:e.target.value}:form.attributes})} placeholder={t("بۆ نموونە: بریانی تایبەت","مثال: برياني خاص","e.g. Signature biryani")}/></label>
      <label className="post-field"><span className="post-field-label">{t("نرخ","السعر","Price")}<em>*</em></span><div className="input-with-suffix"><input required type="number" min="0" value={form.price} onChange={e=>setForm({...form,price:e.target.value})}/><span>د.ع</span></div></label>
      <label className="post-field"><span className="post-field-label">{t("بەش","القسم","Category")}<em>*</em></span><select value={form.category} onChange={e=>setForm({...form,category:e.target.value,attributes:{}})}>{roles.filter(r=>allowedCategories.includes(r.id)).map(r=><option value={r.id} key={r.id}>{t(r.ku,r.ar,r.en)}</option>)}</select></label>
      <label className="post-field post-field-wide"><span className="post-field-label">{t("وەسف","الوصف","Description")}</span><textarea rows={4} value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder={t("کورتەیەک لەسەر بەرهەم، خزمەت یان تایبەتمەندییەکە بنووسە...","اكتب وصفاً مختصراً عن المنتج أو الخدمة...","Write a short description about the product or service...")}/></label>
     </div>
    </section>

    <section className="post-card">
     <div className="post-section-head"><div className="post-step">02</div><div><h3>{t("تایبەتمەندییەکانی بەش","خصائص القسم","Category details")}</h3><p>{selectedRole?t(selectedRole.ku,selectedRole.ar,selectedRole.en):""} · {t("تایبەتمەندییە پەیوەندیدارەکان لێرە پڕبکەرەوە.","أكمل التفاصيل الخاصة بهذا القسم.","Complete the details specific to this category.")}</p></div></div>
     <div className="category-pill">{selectedRole?.icon}<span>{selectedRole?t(selectedRole.ku,selectedRole.ar,selectedRole.en):""}</span></div>
    <div className="post-grid two">{fields.filter(item=>item.key!=="video_url").map(renderField)}</div>
    </section>

    <section className="post-card">
    <div className="post-section-head"><div className="post-step">03</div><div><h3>{t("وێنەکان","الصور","Images")}</h3><p>{t("وێنەکان لە گەلەری یان کامێرا هەڵبژێرە؛ تا ٨ وێنە.","اختر الصور من المعرض أو الكاميرا؛ حتى 8 صور.","Choose images from your gallery or camera; up to 8 images.")}</p></div><strong className="image-count">{images.length} / 8</strong></div>
    <div className="image-upload-zone"><UploadCloud size={28}/><strong>{t("وێنەکان هەڵبژێرە","اختر الصور","Choose your images")}</strong><small>{t("PNG و JPG، تا ٨ وێنە","PNG و JPG، حتى 8 صور","PNG and JPG, up to 8 images")}</small><div className="image-upload-actions"><label><ImagePlus size={16}/>{t("لە گەلەری","من المعرض","Gallery")}<input type="file" accept="image/*" multiple onChange={uploadImages} disabled={uploading||images.length>=8}/></label><label><Camera size={16}/>{t("لە کامێرا","من الكاميرا","Camera")}<input type="file" accept="image/*" capture="environment" onChange={uploadImages} disabled={uploading||images.length>=8}/></label></div></div>
    {uploading&&<p className="image-uploading">{t("وێنەکان بار دەکرێن...","جار رفع الصور...","Uploading images...")}</p>}
    {images.length>0&&<div className="image-preview-grid">{images.map((url:string,index:number)=><div className="image-preview" key={`${url}-${index}`}><img src={url} alt="" onError={e=>{e.currentTarget.style.display="none"}}/><span>{index+1}</span><button type="button" onClick={()=>removeImage(url)} aria-label={t("سڕینەوەی وێنە","حذف الصورة","Remove image")}><X size={13}/></button></div>)}</div>}
    </section>

    <div className="post-actions-bar">
      <button className="post-publish" type="button" onClick={save}><Plus size={18}/>{form.id?t("پاشەکەوتکردنی گۆڕانکاری","حفظ التعديلات","Save changes"):t("پۆستکردن","نشر المنشور","Publish post")}</button>
    </div>
   </div>

   <aside className="post-preview-column">
    <div className="preview-sticky">
     <div className="preview-heading"><div><span>{t("پێشبینین","معاينة","Preview")}</span><h3>{t("پۆستی تۆ","منشورك","Your listing")}</h3></div><Eye size={18}/></div>
     <article className="live-post-card">
      <div className="live-post-image">{images[0]?<img src={images[0]} alt="" onError={e=>{e.currentTarget.style.display="none"}}/>:<div className="live-placeholder">{selectedRole?.icon||"✦"}<span>{t("وێنەی پۆست","صورة المنشور","Post image")}</span></div>}<span className="live-badge">{t("نوێ","جديد","NEW")}</span></div>
      <div className="live-post-body">
       <div className="live-meta"><span>{selectedRole?t(selectedRole.ku,selectedRole.ar,selectedRole.en):"SHAKH SUPER"}</span><span>SHAKH SUPER</span></div>
       <h4>{form.name||t("ناوی بەرهەمەکەت","اسم المنتج","Your product name")}</h4>
       <p>{form.description||t("وەسفی پۆستەکەت لێرە پیشان دەدرێت...","سيظهر وصف منشورك هنا...","Your listing description will appear here...")}</p>
       <div className="live-price">{form.price?`${new Intl.NumberFormat("en-US").format(Number(form.price))} د.ع`:"0 د.ع"}</div>
       <div className="live-tags">{fieldValue("availability")&&<span>{String(fieldValue("availability"))}</span>}{fieldValue("condition")&&<span>{String(fieldValue("condition"))}</span>}{fieldValue("discount")&&<span>{String(fieldValue("discount"))}% {t("داشکاندن","خصم","off")}</span>}</div>
       <button type="button" className="live-cta">{t("زیادکردن بۆ سەبەتە","أضف للسلة","Add to cart")}</button>
      </div>
     </article>
     <div className="preview-tip"><span>✦</span><p>{t("ئەمە تەنها پێشبینینە؛ هیچ داتایەک تا پۆستکردن نەنێردرێت.","هذه معاينة فقط؛ لن يتم إرسال أي بيانات حتى النشر.","This is only a preview. Nothing is submitted until you publish.")}</p></div>
    </div>
   </aside>
  </div>
 </div>
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