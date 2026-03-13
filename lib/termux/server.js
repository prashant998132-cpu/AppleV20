const http=require('http'),{execSync}=require('child_process')
http.createServer((req,res)=>{
res.setHeader('Access-Control-Allow-Origin','*')
res.setHeader('Content-Type','application/json')
if(req.url==='/ping'){res.end(JSON.stringify({ok:true}));return}
if(req.url==='/run'&&req.method==='POST'){
let b=''
req.on('data',d=>b+=d)
req.on('end',()=>{
try{const{cmd}=JSON.parse(b);const o=execSync(cmd,{timeout:5000}).toString().trim();res.end(JSON.stringify({ok:true,output:o||'Done!'}))}
catch(e){res.end(JSON.stringify({ok:false,output:e.message}))}
})}
}).listen(1234,()=>console.log('JARVIS ready on :1234'))
