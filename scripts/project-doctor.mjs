import {spawn} from "node:child_process";

const checks=[
  {name:"TypeScript",command:"npm",args:["run","typecheck"]},
  {name:"Production build",command:"npm",args:["run","build"]}
];

function runCheck({command,args}){
  return new Promise(resolve=>{
    const child=spawn(command,args,{stdio:["ignore","pipe","pipe"]});
    let output="";
    child.stdout.on("data",chunk=>{output+=chunk});
    child.stderr.on("data",chunk=>{output+=chunk});
    child.on("error",error=>resolve({code:1,output:error.message}));
    child.on("close",code=>resolve({code:code??1,output}));
  });
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

console.log("SHAKH SUPER project doctor\n");
let failed=false;
for(const check of checks){
  process.stdout.write(`Checking ${check.name}... `);
  const result=await runCheck(check);
  if(result.code===0){
    console.log("OK");
    continue;
  }
  failed=true;
  console.log("FAILED");
  const hints=diagnose(result.output);
  console.log(result.output.trim().split("\n").slice(-12).join("\n"));
  for(const hint of hints)console.log(`  -> ${hint}`);
}

if(failed){
  console.log("\nDoctor found a problem. It does not rewrite application code automatically because a wrong fix could corrupt data or authorization.");
  process.exitCode=1;
}else{
  console.log("\nDoctor found no TypeScript or production-build errors.");
}