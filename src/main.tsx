import React, {useEffect, useMemo, useState} from "react";
import {createRoot} from "react-dom/client";
import {ShoppingCart, Search, UserRound, Bike, Store, Utensils, Shirt, Sparkles, CarFront, ShieldCheck, Plus, Trash2, LayoutDashboard, Wallet, Package, Languages, Menu, X} from "lucide-react";
import {isSupabaseConfigured, supabase} from "./lib/supabase";
import {mapConfig} from "./lib/platform";
import "./styles.css";

type Role="super_admin"|"admin"|"captain"|"restaurant"|"supermarket"|"fashion"|"beauty"|"car_dealer"|"customer";
type Product={id:string;name:string;description:string;category:string;price:number;emoji:string;owner:string;ownerId:string|null;status:string;attributes:Record<string,unknown>};
type Field={key:string;label:string;type:"text"|"number"|"date"|"select"|"multi"|"textarea";required?:boolean;options?:string[];placeholder?:string};
const roles: {id:Role;ku:string;ar:string;en:string;icon:React.ReactNode}[]=[
{id:"restaurant",ku:"چێشتخانە",ar:"مطعم",en:"Restaurant",icon:<Utensils/>},
{id:"supermarket",ku:"سوپەرمارکێت",ar:"سوبرماركت",en:"Supermarket",icon:<Store/>},
{id:"fashion",ku:"جل و بەرگ",ar:"أزياء",en:"Fashion",icon:<Shirt/>},
{id:"beauty",ku:"جوانکاری",ar:"تجميل",en:"Beauty",icon:<Sparkles/>},
{id:"car_dealer",ku:"ئۆتۆمبێل",ar:"سيارات",en:"Cars",icon:<CarFront/>},
{id:"captain",ku:"گەیاندن",ar:"توصيل",en:"Delivery",icon:<Bike/>}
];
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
 const [category,setCategory]=useState("all");
 const [cart,setCart]=useState<Product[]>([]);
 const [products,setProducts]=useState<Product[]>([]);
 const [userId,setUserId]=useState<string|null>(null);
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
    if(session?.user.id){
      const {data:profile}=await supabase.from("profiles").select("role").eq("id",session.user.id).maybeSingle();
      if(profile?.role&&(roles.some(item=>item.id===profile.role)||profile.role==="super_admin"||profile.role==="admin"))setRole(profile.role as Role);
    }
    const query=supabase.from("posts").select("id,user_id,title,content,category,price,status,image_url,images,attributes,created_at").eq("status","active").order("created_at",{ascending:false});
    const {data,error}=await query;
    if(error){console.error("Supabase posts load error",error);setNotice(error.message)}
    if(!error&&data){setProducts(data.map((post:any)=>({id:post.id,name:post.title,description:post.content||"",category:post.category,price:Number(post.price),emoji:post.image_url||"📦",ownerId:post.user_id||null,owner:"SHAKH SUPER",status:post.status,attributes:{...(post.attributes||{}),images:post.images||[]}})))}
  setLoading(false);
 }
 async function authenticate(){
  if(!supabase){setAuthMessage(t("پەیوەندی Supabase ڕێک نەخراوە","لم يتم إعداد اتصال Supabase","Supabase is not configured"));return;}
  if(authMode==="forgot"){await sendReset();return;}
  if(authMode==="reset"){await updatePassword();return;}
  if(!authEmail||!authPassword){setAuthMessage(t("ئیمەیڵ و وشەی نهێنی پێویستن","البريد الإلكتروني وكلمة المرور مطلوبان","Email and password are required"));return;}
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
    else {setAuthMessage("");await loadData();}
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
    if(authPassword.length<6){setAuthMessage(t("وشەی نهێنی دەبێت لانیکەم ٦ پیت بێت","يجب أن تتكون كلمة المرور من 6 أحرف على الأقل","Password must be at least 6 characters"));return;}
    if(authPassword!==authConfirmPassword){setAuthMessage(t("وشە نهێنییەکان یەکسان نین","كلمتا المرور غير متطابقتين","Passwords do not match"));return;}
    setAuthBusy(true);setAuthMessage("");
    const {error}=await supabase.auth.updateUser({password:authPassword});
    if(error)setAuthMessage(readableAuthError(error,t));
    else {setAuthMode("login");setAuthPassword("");setAuthConfirmPassword("");setAuthMessage(t("وشەی نهێنی نوێ کرایەوە. ئێستا دەتوانیت بچیتە ژوورەوە.","تم تحديث كلمة المرور. يمكنك تسجيل الدخول الآن.","Password updated. You can sign in now."));}
    setAuthBusy(false);
   }
 async function signOut(){if(supabase)await supabase.auth.signOut();setUserId(null);setRole("customer");}
 async function installApp(){if(!installPrompt)return;await installPrompt.prompt();setInstallPrompt(null);}
 function refreshApp(){navigator.serviceWorker?.controller?.postMessage({type:"SKIP_WAITING"});window.location.reload();}
 const visible=useMemo(()=>products.filter(p=>(category==="all"||p.category===category)&&`${p.name} ${p.owner}`.toLowerCase().includes(search.toLowerCase())&&p.status==="active"),[products,category,search]);
 const money=(n:number)=>new Intl.NumberFormat("en-US").format(n)+" د.ع";
 async function savePost(){
  const fields=categorySchemas[form.category]||[];
  const missing=fields.filter(item=>item.required&&(!form.attributes[item.key]||(Array.isArray(form.attributes[item.key])&&!(form.attributes[item.key] as unknown[]).length))).map(item=>item.label);
  if(!form.name||!form.price){setNotice(t("ناو و نرخ پێویستن","الاسم والسعر مطلوبان","Name and price are required"));return;}
  if(missing.length){setNotice(t(`ئەم خانانە پێویستن: ${missing.join(", ")}`,`الحقول المطلوبة: ${missing.join(", ")}`,`Required fields: ${missing.join(", ")}`));return;}
  if(!supabase||!userId){setNotice(t("بۆ پۆستکردن دەبێت بچیتە ژوورەوە","يجب تسجيل الدخول للنشر","Sign in to publish a post"));return;}
  const images=form.images.split(/[\n,]/).map(item=>item.trim()).filter(Boolean).slice(0,8);
  const payload={title:form.name,content:form.description,category:form.category,price:+form.price,image_url:images[0]||form.emoji||null,images,attributes:form.attributes};
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
    {loading?<div className="panel"><p>{t("داتاکان بار دەکرێن...","جار تحميل البيانات...","Loading data...")}</p></div>:tab==="auth"?<Auth mode={authMode} setMode={setAuthMode} email={authEmail} setEmail={setAuthEmail} password={authPassword} setPassword={setAuthPassword} name={authName} setName={setAuthName} busy={authBusy} message={authMessage} submit={authenticate} t={t} googleSignIn={handleGoogleSignIn}/>:tab==="cart"?<Cart cart={cart} setCart={setCart} money={money} t={t} checkout={checkout}/>:tab==="post"?<Post form={form} setForm={setForm} save={savePost} t={t}/>:tab==="dashboard"?<Dashboard products={products} role={role} setRole={setRole} t={t}/>:tab==="wallet"?<WalletView money={money} t={t}/>:<><div className="section-head"><div><h2>{t("پۆستە نوێکان","المنشورات الجديدة","Latest posts")}</h2><p>{t("بەرهەمەکانت هەڵبژێرە و داواکاری بکە","اختر منتجاتك واطلب الآن","Choose products and order now")}</p></div><div className="role-select"><UserRound size={16}/><select value={role} onChange={e=>setRole(e.target.value as Role)}><option value="customer">{t("کڕیار","عميل","Customer")}</option>{roles.map(r=><option value={r.id} key={r.id}>{t(r.ku,r.ar,r.en)}</option>)}<option value="super_admin">Super Admin</option></select></div></div><div className="chips"><button className={category==="all"?"selected":""} onClick={()=>setCategory("all")}>{t("هەموو","الكل","All")}</button>{roles.map(r=><button className={category===r.id?"selected":""} onClick={()=>setCategory(r.id)} key={r.id}>{t(r.ku,r.ar,r.en)}</button>)}</div><div className="grid">{visible.map(p=><article className="card" key={p.id}><div className="product-image">{p.emoji}<span className="badge">{p.category==="car_dealer"?t("فرۆشتنی ئۆتۆمبێل","سيارة للبيع","For sale"):t("بەردەستە","متوفر","Available")}</span></div><div className="card-body"><small>{p.owner}</small><h3>{p.name}</h3><div className="price">{money(p.price)}</div><button className="add" onClick={()=>buy(p)}><Plus size={17}/>{t("زیادکردن بۆ سەبەتە","أضف للسلة","Add to cart")}</button>{p.ownerId===userId&&<button className="iconbtn" onClick={()=>editPost(p)} title={t("دەستکاری","تعديل","Edit")}>✎</button>}</div></article>)}</div></>}
   </main>
  </div>
  <footer>{t("© شاخ سوپەر — پلاتفۆرمی فرۆشتن و گەیاندن","© شاخ سوبر — منصة التسوق والتوصيل","© Shakh Super — Marketplace & delivery platform")} <span>کوردی · عربي · English</span></footer>
 </div>
}
function Auth({mode,setMode,email,setEmail,password,setPassword,name,setName,busy,message,submit,t,googleSignIn}:{mode:"login"|"signup"|"forgot"|"reset";setMode:React.Dispatch<React.SetStateAction<"login"|"signup"|"forgot"|"reset">>;email:string;setEmail:React.Dispatch<React.SetStateAction<string>>;password:string;setPassword:React.Dispatch<React.SetStateAction<string>>;name:string;setName:React.Dispatch<React.SetStateAction<string>>;busy:boolean;message:string;submit:()=>void;t:(a:string,b:string,c:string)=>string;googleSignIn:()=>void}){const [confirmPassword,setConfirmPassword]=useState("");const [localMessage,setLocalMessage]=useState("");const recovery=mode==="forgot"||mode==="reset";const title=mode==="login"?t("بەخێربێیتەوە","مرحباً بعودتك","Welcome back"):mode==="signup"?t("هەژمارێکی نوێ دروست بکە","أنشئ حساباً جديداً","Create your account"):mode==="forgot"?t("وشەی نهێنیت لەبیرچووە؟","نسيت كلمة المرور؟","Forgot your password?"):t("وشەی نهێنی نوێ دابنێ","أنشئ كلمة مرور جديدة","Create a new password");const submitForm=()=>{if(mode==="reset"&&password!==confirmPassword){setLocalMessage(t("وشە نهێنییەکان یەکسان نین","كلمتا المرور غير متطابقتين","Passwords do not match"));return;}setLocalMessage("");submit()};return <div className="auth-panel"><div className="auth-intro"><div className="auth-orbit">S</div><span>SHAKH SUPER</span><h2>{title}</h2><p>{recovery?t("ئێمە یارمەتیت دەدەین بۆ گەڕاندنەوەی دەستگەیشتن بە هەژمارەکەت.","سنساعدك على استعادة الوصول إلى حسابك.","We will help you get back into your account."):t("بازاڕەکەت بە ئارامی بەڕێوە ببە.","أدر سوقك بسهولة.","Your marketplace, made simple.")}</p></div><div className="auth-form"><div className="auth-kicker">{mode==="signup"?t("بەشداربوون","انضم إلينا","Join us"):mode==="login"?t("چوونەژوورەوەی پارێزراو","دخول آمن","Secure sign in"):t("پاراستنی هەژمار","حماية الحساب","Account recovery")}</div>{mode==="signup"&&<input placeholder={t("ناوی تەواو","الاسم الكامل","Full name")} value={name} onChange={e=>setName(e.target.value)}/>}<input type="email" autoComplete="email" placeholder={t("ئیمەیڵ","البريد الإلكتروني","Email")} value={email} onChange={e=>setEmail(e.target.value)}/>{mode!=="forgot"&&<input type="password" autoComplete={mode==="login"?"current-password":"new-password"} placeholder={t("وشەی نهێنی","كلمة المرور","Password")} value={password} onChange={e=>setPassword(e.target.value)}/>} {mode==="reset"&&<input type="password" autoComplete="new-password" placeholder={t("دووبارە وشەی نهێنی بنووسە","أعد كتابة كلمة المرور","Confirm password")} value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)}/>} {mode!=="reset"&&mode!=="forgot"&&<button type="button" className="google-btn" onClick={googleSignIn} disabled={busy}>{t("بە گۆگڵ بچۆ ژوورەوە","تسجيل الدخول عبر Google","Continue with Google")}</button>} {(message||localMessage)&&<p className="auth-message">{localMessage||message}</p>}<button className="primary auth-submit" disabled={busy||!email||(mode!=="forgot"&&!password)} onClick={submitForm}>{busy?t("چاوەڕوان بە...","انتظر...","Please wait..."):mode==="login"?t("چوونەژوورەوە","تسجيل الدخول","Sign in"):mode==="signup"?t("دروستکردنی هەژمار","إنشاء حساب","Create account"):mode==="forgot"?t("ناردنی لینکی گۆڕین","إرسال رابط الاستعادة","Send reset link"):t("نوێکردنەوەی وشەی نهێنی","تحديث كلمة المرور","Update password")}</button><button type="button" className="linkbtn auth-back" onClick={()=>setMode(mode==="login"?"signup":"login")}>{mode==="login"?t("هەژمارت نییە؟ دروستی بکە","ليس لديك حساب؟ أنشئ حساباً","Create an account"):mode==="signup"?t("پێشتر هەژمارت هەیە؟ بچۆ ژوورەوە","لديك حساب؟ سجل الدخول","Already have an account? Sign in"):t("گەڕانەوە بۆ چوونەژوورەوە","العودة لتسجيل الدخول","Back to sign in")}</button>{mode==="login"&&<button type="button" className="forgot-link" onClick={()=>{setMode("forgot");setLocalMessage("")}}>{t("وشەی نهێنیت لەبیرچووە؟","نسيت كلمة المرور؟","Forgot password?")}</button>}</div></div>}function Cart({cart,setCart,money,t,checkout}:{cart:Product[];setCart:React.Dispatch<React.SetStateAction<Product[]>>;money:(n:number)=>string;t:(a:string,b:string,c:string)=>string;checkout:()=>void}){const total=cart.reduce((s,p)=>s+p.price,0);return <div className="panel"><h2>{t("سەبەتەی کڕین","سلة التسوق","Shopping cart")}</h2>{cart.length===0?<p>{t("سەبەتەکە بەتاڵە","السلة فارغة","Your cart is empty")}</p>:<>{cart.map((p,i)=><div className="cartrow" key={`${p.id}-${i}`}><span>{p.emoji} {p.name}</span><b>{money(p.price)}</b><button onClick={()=>setCart(c=>c.filter((_,j)=>j!==i))}><Trash2 size={16}/></button></div>)}<div className="total">{t("کۆی گشتی","المجموع","Total")} <b>{money(total)}</b></div><button className="primary" onClick={checkout}>{t("داواکاری بە کاش لە کاتی گەیاندن","الدفع نقداً عند الاستلام","Cash on delivery")} ✓</button></>}</div>}
function Post({form,setForm,save,t}:{form:any;setForm:any;save:()=>void;t:(a:string,b:string,c:string)=>string}){
 const fields=categorySchemas[form.category]||[];
 const update=(key:string,value:unknown)=>setForm({...form,attributes:{...form.attributes,[key]:value}});
 return <div className="panel"><h2>{t(form.id?"دەستکاری پۆست":"پۆستی نوێ زیاد بکە",form.id?"تعديل المنشور":"إضافة منشور جديد",form.id?"Edit post":"Create new post")}</h2><div className="form">
  <label>{t("زانیاری سەرەکی","المعلومات الأساسية","Basic information")}</label>
  <input required placeholder={t("ناوی بەرهەم","اسم المنتج","Product name")} value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/>
  <input required type="number" min="0" placeholder={t("نرخ بە دینار","السعر بالدينار","Price in IQD")} value={form.price} onChange={e=>setForm({...form,price:e.target.value})}/>
  <select value={form.category} onChange={e=>setForm({...form,category:e.target.value,attributes:{}})}>{roles.filter(r=>r.id!=="captain").map(r=><option value={r.id} key={r.id}>{t(r.ku,r.ar,r.en)}</option>)}</select>
  <textarea placeholder={t("وەسف","الوصف","Description")} value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/>
  <label>{t("تایبەتمەندییەکانی ئەم بەشە","خصائص هذا القسم","Category-specific fields")}</label>
  {fields.map(item=><label key={item.key}>{item.label}{item.required&&" *"}{item.type==="select"?<select value={String(form.attributes[item.key]||"")} onChange={e=>update(item.key,e.target.value)}><option value="">{t("هەڵبژێرە","اختر","Select")}</option>{item.options?.map(option=><option key={option}>{option}</option>)}</select>:item.type==="multi"?<select multiple value={Array.isArray(form.attributes[item.key])?form.attributes[item.key] as string[]:[]} onChange={e=>update(item.key,Array.from(e.target.selectedOptions).map(option=>option.value))}>{item.options?.map(option=><option key={option}>{option}</option>)}</select>:item.type==="textarea"?<textarea value={String(form.attributes[item.key]||"")} onChange={e=>update(item.key,e.target.value)}/>:<input type={item.type} value={String(form.attributes[item.key]||"")} onChange={e=>update(item.key,e.target.value)}/>}</label>)}
  <label>{t("وێنەکان (هەر دێڕێک یەک لینک، تا ٨)","الصور (رابط في كل سطر، حتى 8)","Images (one URL per line, up to 8)")}<textarea value={form.images} onChange={e=>setForm({...form,images:e.target.value})}/></label>
  <button className="primary" onClick={save}><Plus/> {form.id?t("پاشەکەوتکردنی گۆڕانکاری","حفظ التعديلات","Save changes"):t("پۆستکردن","نشر","Publish")}</button>
 </div></div>
}
function Dashboard({products,t}:{products:Product[];role:Role;setRole:any;t:(a:string,b:string,c:string)=>string}){return <div className="panel"><h2>{t("داشبۆردی بەڕێوەبردن","لوحة التحكم","Management dashboard")}</h2><div className="stats"><div><Package/><b>{products.length}</b><span>{t("پۆستەکانی بارکراو","المنشورات المحملة","Loaded posts")}</span></div></div><p>{t("دەسەڵات و داتا لە Supabase و RLS ـەوە کۆنترۆڵ دەکرێن.","الصلاحيات والبيانات تدار عبر Supabase و RLS.","Permissions and data are controlled by Supabase and RLS.")}</p></div>}
function WalletView({t}:{money:(n:number)=>string;t:(a:string,b:string,c:string)=>string}){return <div className="panel"><h2>{t("پارە و مامەڵەکان","المحفظة والمعاملات","Wallet & transactions")}</h2><p>{t("باڵانس و مامەڵەکان لە Supabase ـەوە پیشان دەدرێن کاتێک wallet API ـەکە چالاک بکرێت.","سيتم عرض الرصيد والمعاملات من Supabase بعد تفعيل واجهة المحفظة.","Wallet balances and transactions will be read from Supabase when the wallet API is enabled.")}</p></div>}
createRoot(document.getElementById("root")!).render(<App/>);