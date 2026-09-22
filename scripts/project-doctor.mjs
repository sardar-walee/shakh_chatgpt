import {spawn} from "node:child_process";
import {existsSync, readFileSync} from "node:fs";

const checks=[
  {name:"TypeScript",command:"npm",args:["run","typecheck"]},
  {name:"Production build",command:"npm",args:["run","build"]}
];
const args=new Set(process.argv.slice(2));
const fix=args.has("--fix");
const runSupabaseCheck=args.has("--supabase")||args.has("--all");
const checkSmoke=args.has("--smoke")||args.has("--all");
const notify=args.has("--notify")||args.has("--all");
const failures=[];

function loadEnv(){
  if(!existsSync(".env"))return {};
  return Object.fromEntries(readFileSync(".env","utf8").split(/\r?\n/).filter(line=>line&&!line.startsWith("#")&&line.includes("=")).map(line=>{
    const index=line.indexOf("=");
    return [line.slice(0,index),line.slice(index+1).trim().replace(/^['\"]|['\"]$/g,"")];
  }));
}

function runCheck({command,args}){
  return new Promise(resolve=>{
    const isWindows=process.platform==="win32";
    const executable=isWindows?(process.env.ComSpec||"cmd.exe"):command;
    const childArgs=isWindows?["/d","/s","/c",[command,...args].join(" ")]:args;
    const child=spawn(executable,childArgs,{stdio:["ignore","pipe","pipe"]});
    let output="";
    child.stdout.on("data",chunk=>{output+=chunk});
    child.stderr.on("data",chunk=>{output+=chunk});
    child.on("error",error=>resolve({code:1,output:error.message}));
    child.on("close",code=>resolve({code:code??1,output}));
  });
}

async function check(name,checkDefinition,{repair=false}={}){
  process.stdout.write(`Checking ${name}... `);
  let result=await runCheck(checkDefinition);
  if(result.code!==0&&repair&&fix){
    process.stdout.write("repairing... ");
    const install=await runCheck({command:"npm",args:["install"]});
    if(install.code===0)result=await runCheck(checkDefinition);
  }
  if(result.code===0){console.log("OK");return;}
  failures.push(name);
  console.log("FAILED");
  console.log(result.output.trim().split("\n").slice(-12).join("\n"));
  for(const hint of diagnose(result.output))console.log(`  -> ${hint}`);
}

function diagnose(output){
  const hints=[];
  if(/Cannot find module|Could not resolve/i.test(output)){
    hints.push("Dependency or import path is missing. Run npm install and verify the referenced file/package.");
  }
  if(/TS\d+|Type error|does not exist on type/i.test(output)){
    hints.push("TypeScript contract mismatch. Fix the first reported source location, then rerun npm run typecheck.");
  }
  if(/VITE_SUPABASE_URL|VITE_SUPABASE_ANON_KEY/i.test(output)){
    hints.push("Supabase configuration is missing. Copy .env.example to .env and provide the public VITE_SUPABASE values.");
  }
  if(/permission denied|row-level security|JWT/i.test(output)){
    hints.push("This is an authentication/RLS problem, not a frontend build problem. Check the signed-in user, profile role, and Supabase migrations.");
  }
  return hints;
}

async function request(url,key,options={}){
  try{
    const response=await fetch(url,{...options,headers:{apikey:key,Authorization:`Bearer ${key}`,...(options.headers||{})}});
    return {status:response.status,body:await response.text()};
  }catch(error){return {status:0,body:String(error)}}
}

async function checkSupabase(env){
  const url=env.VITE_SUPABASE_URL;
  const key=env.VITE_SUPABASE_ANON_KEY;
  if(!url||!key||url.includes("YOUR_PROJECT")||key.includes("YOUR_PUBLIC")){
    failures.push("Supabase configuration");
    console.log("Checking Supabase configuration... FAILED");
    console.log("  -> Add real VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env; secrets are never printed.");
    return;
  }
  for(const table of ["posts","profiles"]){
    process.stdout.write(`Checking Supabase ${table} endpoint... `);
    const result=await request(`${url}/rest/v1/${table}?select=*&limit=1`,key);
    if(result.status>=200&&result.status<300){console.log("OK");continue;}
    failures.push(`Supabase ${table}`);
    console.log(`FAILED (HTTP ${result.status})`);
    console.log("  -> Check that the table exists, RLS is enabled, and migrations ran in order.");
  }
}

async function checkAuthSmoke(env){
  const email=env.DOCTOR_TEST_EMAIL;
  const password=env.DOCTOR_TEST_PASSWORD;
  if(!email||!password||!env.VITE_SUPABASE_URL||!env.VITE_SUPABASE_ANON_KEY){
    console.log("Checking auth/profile/posts smoke test... SKIPPED");
    console.log("  -> Set DOCTOR_TEST_EMAIL and DOCTOR_TEST_PASSWORD in .env to enable it. Credentials are never printed.");
    return;
  }
  const url=env.VITE_SUPABASE_URL;
  const key=env.VITE_SUPABASE_ANON_KEY;
  process.stdout.write("Checking auth login... ");
  const login=await request(`${url}/auth/v1/token?grant_type=password`,key,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email,password})});
  if(login.status<200||login.status>=300){failures.push("Auth login");console.log(`FAILED (HTTP ${login.status})`);console.log("  -> Verify the test account, confirmation, and Auth providers.");return;}
  const session=JSON.parse(login.body);
  console.log("OK");
  for(const [name,path] of [["profile",`profiles?select=id,full_name,phone,role&id=eq.${session.user.id}&limit=1`],["active posts","posts?select=id,status&status=eq.active&limit=1"]]){
    process.stdout.write(`Checking ${name} access... `);
    const result=await request(`${url}/rest/v1/${path}`,key,{headers:{Authorization:`Bearer ${session.access_token}`}});
    if(result.status>=200&&result.status<300)console.log("OK");
    else {failures.push(`${name} access`);console.log(`FAILED (HTTP ${result.status})`);console.log("  -> Check profile creation and RLS policies.");}
  }
}

async function notifyFailure(message,env){
  process.stderr.write("\x07");
  if(!env.DOCTOR_WEBHOOK_URL)return;
  try{await fetch(env.DOCTOR_WEBHOOK_URL,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text:message})})}catch{console.error("Notification webhook failed.")}
}

console.log("SHAKH SUPER project doctor\n");
for(const checkDefinition of checks)await check(checkDefinition.name,checkDefinition,{repair:true});
const env=loadEnv();
if(runSupabaseCheck)await checkSupabase(env);
if(checkSmoke)await checkAuthSmoke(env);
if(failures.length){
  const message=`SHAKH SUPER doctor found ${failures.length} problem(s): ${failures.join(", ")}`;
  console.log(`\n${message}`);
  if(notify)await notifyFailure(message,env);
  console.log("Automatic repair only installs dependencies. Application code, database, authorization, and credentials are never changed automatically.");
  process.exitCode=1;
}else console.log("\nDoctor found no problems in the selected checks.");