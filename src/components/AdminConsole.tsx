import {useEffect,useMemo,useState} from "react";
import {FileText,RefreshCw,Search,Settings,ShieldCheck,ShoppingBag,Tags,Users} from "lucide-react";
import {supabase} from "../lib/supabase";

type Role="super_admin"|"admin"|"captain"|"restaurant"|"supermarket"|"fashion"|"beauty"|"car_dealer"|"customer";
type Translate=(ku:string,ar:string,en:string)=>string;
type AdminTab="users"|"posts"|"orders"|"categories"|"audit"|"settings";
type AdminConsoleProps={role:Role;t:Translate;productsCount:number};

const statuses=["pending","accepted","preparing","ready","assigned","picked_up","on_the_way","out_for_delivery","delivered","cancelled"];
const roles:Role[]=["super_admin","admin","captain","restaurant","supermarket","fashion","beauty","car_dealer","customer"];

export default function AdminConsole({role,t,productsCount}:AdminConsoleProps){
 const [tab,setTab]=useState<AdminTab>("users");
 const [rows,setRows]=useState<Record<string,unknown>[]>([]);
 const [search,setSearch]=useState("");
 const [status,setStatus]=useState("");
 const [loading,setLoading]=useState(false);
 const [error,setError]=useState("");
 const [message,setMessage]=useState("");
 const [categoryName,setCategoryName]=useState("");
 const [settings,setSettings]=useState<Record<string,unknown>|null>(null);

 const load=async()=>{
  const client=supabase;
  if(!client)return;
  setLoading(true);setError("");setMessage("");
  try {
   let query:any;
   if(tab==="users")query=client.from("profiles").select("id,full_name,phone,role,created_at").order("created_at",{ascending:false});
   if(tab==="posts")query=client.from("posts").select("id,user_id,title,category,price,status,created_at").order("created_at",{ascending:false});
   if(tab==="orders")query=client.from("orders").select("id,customer_id,captain_id,status,total,created_at").order("created_at",{ascending:false});
   if(tab==="categories")query=client.from("marketplace_categories").select("id,slug,name,name_ar,name_en,active,sort_order,allowed_roles,fields").order("sort_order");
   if(tab==="audit")query=client.from("audit_logs").select("id,actor_id,actor_role,action,resource_type,resource_id,old_data,new_data,created_at").order("created_at",{ascending:false}).limit(200);
   if(tab==="settings"){
    const result=await client.from("platform_settings").select("*").eq("id",true).maybeSingle();
    if(result.error)setError(result.error.message);else setSettings(result.data as Record<string,unknown>|null);
    setLoading(false);return;
   }
   const result=await query;
   if(result.error)setError(result.error.message);else setRows((result.data||[]) as Record<string,unknown>[]);
  } catch (err: any) {
   console.warn("AdminConsole load error:", err);
   setError(err?.message || t("پەیوەندی سەرکەوتوو نەبوو","فشل الاتصال","Connection failed"));
  } finally {
   setLoading(false);
  }
 };
 useEffect(()=>{void load()},[tab]);
 useEffect(()=>{
  const client=supabase;
  if(!client)return;
  try {
   const channel=client.channel("admin-console").on("postgres_changes",{event:"*",schema:"public",table:tab==="posts"?"posts":tab==="orders"?"orders":tab==="audit"?"audit_logs":"profiles"},()=>void load()).subscribe();
   return()=>{void client.removeChannel(channel)};
  } catch (err) {
   console.warn("Admin Console channel error:", err);
  }
 },[tab]);
 const visible=useMemo(()=>rows.filter(row=>{
  const text=Object.values(row).map(value=>Array.isArray(value)?value.join(" "):String(value??"")).join(" ").toLocaleLowerCase();
    return (!search.trim()||text.includes(search.trim().toLocaleLowerCase()))&&(!status||String(row.status||row.active)===status);
 }),[rows,search,status]);
 const call=async(name:string,args:Record<string,unknown>)=>{
  if(!supabase)return;
  setLoading(true);setError("");
  const result=await supabase.rpc(name,args);
  if(result.error)setError(result.error.message);else {setMessage(t("کردارەکە سەرکەوتوو بوو","تم تنفيذ الإجراء بنجاح","Action completed"));await load();}
  setLoading(false);
 };
 const updateCategory=async()=>{
  if(!supabase||!categoryName.trim())return;
  const result=await supabase.from("marketplace_categories").insert({slug:categoryName.trim().toLowerCase().replace(/[^a-z0-9]+/g,"-"),name:categoryName.trim()});
  if(result.error)setError(result.error.message);else {setCategoryName("");setMessage(t("بەشەکە زیاد کرا","تمت إضافة القسم","Category added"));await load();}
 };
 const updateSettings=async()=>{
  if(!supabase||!settings)return;
  const result=await supabase.from("platform_settings").update(settings).eq("id",true);
  if(result.error)setError(result.error.message);else setMessage(t("ڕێکخستنەکان نوێکرانەوە","تم تحديث الإعدادات","Settings updated"));
 };
 if(role!=="super_admin"&&role!=="admin")return <div className="panel"><h2>{t("دەسەڵاتت نییە","لا تملك الصلاحية","Access denied")}</h2></div>;
 return <div className="admin-console"><div className="admin-tabs">{([ ["users",Users,"بەکارهێنەران","Users"],["posts",FileText,"پۆستەکان","Posts"],["orders",ShoppingBag,"داواکارییەکان","Orders"],["categories",Tags,"بەشەکان","Categories"],["audit",ShieldCheck,"تۆماری چاودێری","Audit logs"],["settings",Settings,"ڕێکخستنەکان","Settings"]] as const).map(([id,Icon,ku,en])=><button className={tab===id?"selected":""} key={id} onClick={()=>{setTab(id);setSearch("");setStatus("")}}><Icon size={16}/>{t(ku,ku,en)}</button>)}</div><div className="admin-toolbar"><div className="admin-search"><Search size={16}/><input placeholder={t("گەڕان...","بحث...","Search...")} value={search} onChange={event=>setSearch(event.target.value)}/></div>{(tab==="posts"||tab==="orders")&&<select value={status} onChange={event=>setStatus(event.target.value)}><option value="">{t("هەموو دۆخەکان","كل الحالات","All statuses")}</option>{(tab==="orders"?statuses:["active","blocked","deleted"]).map(item=><option key={item} value={item}>{item}</option>)}</select>}<button className="iconbtn" onClick={()=>void load()} title={t("نوێکردنەوە","تحديث","Refresh")}><RefreshCw size={16}/></button></div>{message&&<div className="notice">{message}</div>}{error&&<div className="notice error">{error}</div>}{tab==="settings"&&settings?<SettingsPanel settings={settings} setSettings={setSettings} save={updateSettings} t={t}/>:tab==="categories"?<div className="admin-create"><input placeholder={t("ناوی بەش","اسم القسم","Category name")} value={categoryName} onChange={event=>setCategoryName(event.target.value)}/><button className="primary" onClick={()=>void updateCategory()}>{t("زیادکردنی بەش","إضافة قسم","Create category")}</button><Table rows={visible} tab={tab} role={role} call={call} t={t}/></div>:loading?<div className="panel"><p>{t("داتا بار دەکرێت...","جار تحميل البيانات...","Loading...")}</p></div>:<Table rows={visible} tab={tab} role={role} call={call} t={t}/>}<div className="admin-summary">{t("ژمارەی پۆستەکان","عدد المنشورات","Posts loaded")}: {productsCount} · {t("داتا لە Supabase و RLS کۆنترۆڵ دەکرێت","البيانات محكومة عبر Supabase وRLS","Data is controlled by Supabase and RLS")}</div></div>;
}

function Table({rows,tab,role,call,t}:{rows:Record<string,unknown>[];tab:AdminTab;role:Role;call:(name:string,args:Record<string,unknown>)=>Promise<void>;t:Translate}){
 if(!rows.length)return <div className="panel"><p>{t("هیچ داتایەک نییە","لا توجد بيانات","No records found")}</p></div>;
 return <div className="admin-table">{rows.map(row=><div className="admin-row" key={String(row.id)}><div><strong>{String(row.full_name||row.title||row.name||row.action||row.id)}</strong><small>{String(row.email||row.category||row.role||row.status||row.resource_type||"")}</small></div><span>{row.total?`${row.total} IQD`:row.created_at?new Date(String(row.created_at)).toLocaleString():""}</span><div className="admin-row-actions">{tab==="users"&&role==="super_admin"&&<select value={String(row.role||"")} onChange={event=>void call("admin_change_user_role",{target_user:row.id,new_role:event.target.value})}>{roles.map(item=><option key={item}>{item}</option>)}</select>}{tab==="posts"&&<><button onClick={()=>void call("admin_moderate_post",{target_post:row.id,new_status:"blocked"})}>{t("بلۆک","حظر","Block")}</button><button onClick={()=>void call("admin_moderate_post",{target_post:row.id,new_status:"active"})}>{t("چالاک","تفعيل","Activate")}</button></>}{tab==="orders"&&<select value={String(row.status||"")} onChange={event=>void call("admin_set_order_status",{target_order:row.id,new_status:event.target.value})}>{statuses.map(item=><option key={item}>{item}</option>)}</select>}</div></div>)}</div>;
}

function SettingsPanel({settings,setSettings,save,t}:{settings:Record<string,unknown>;setSettings:(value:Record<string,unknown>)=>void;save:()=>void;t:Translate}){return <div className="panel settings-panel"><h3>{t("ڕێکخستنەکانی پلاتفۆرم","إعدادات المنصة","Platform settings")}</h3><label>{t("ڕێژەی کۆمسیۆن","نسبة العمولة","Commission percent")}<input type="number" value={String(settings.platform_commission_percent??5)} onChange={event=>setSettings({...settings,platform_commission_percent:Number(event.target.value)})}/></label><label>{t("کرێی گەیاندن","رسوم التوصيل","Delivery fee")}<input type="number" value={String(settings.default_delivery_fee??0)} onChange={event=>setSettings({...settings,default_delivery_fee:Number(event.target.value)})}/></label><label>{t("دراو","العملة","Currency")}<input value={String(settings.currency??"IQD")} onChange={event=>setSettings({...settings,currency:event.target.value})}/></label><button className="primary" onClick={save}>{t("پاشەکەوتکردن","حفظ","Save settings")}</button></div>}
