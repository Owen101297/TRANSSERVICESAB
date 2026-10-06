import assert from 'node:assert/strict';
import { createHmac, randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
if(process.env.ERP_GOOGLE_STAGING_TEST!=='1'||process.env.PUBLIC_APP_URL!=='https://erp-staging.owenai.uk')throw Error('Solo staging con habilitación explícita');
const prisma=new PrismaClient();const prefix='google-access-'+randomUUID();const ids=['admin','hseq','driver','inactive'].map(role=>prefix+'-'+role);const googleIds=[prefix+'-pending',prefix+'-blocked'];const cookies={};let checks=0;
function token(index,extra={},version=1){const role=index===2?'conductor':index===1?'hseq':'administrativo';const actor={id:ids[index],documento:ids[index],nombre:'Prueba',perfiles:[role],rolPrincipal:role,sessionVersion:version,...extra,exp:Date.now()+600000};const payload=Buffer.from(JSON.stringify(actor)).toString('base64url');return 'transservices_session='+payload+'.'+createHmac('sha256',process.env.SESSION_SECRET).update(payload).digest('base64url');}
async function request(role,method,path,body,status=200){const response=await fetch('http://127.0.0.1:3000'+path,{method,headers:{'Content-Type':'application/json',...(cookies[role]?{Cookie:cookies[role]}:{})},...(body?{body:JSON.stringify(body)}:{}),redirect:'manual'});const text=await response.text();const data=text?JSON.parse(text):{};assert.equal(response.status,status,path+': '+JSON.stringify(data));checks++;return {data,response};}
try{
 for(let index=0;index<ids.length;index++){await prisma.persona.create({data:{id:ids[index],nombres:'Prueba',apellidos:'Google',numeroDocumento:ids[index],telefono:'',email:prefix+'-'+index+'@example.invalid',perfiles:[index===1?'hseq':index===2?'conductor':'administrativo'],estado:index===3?'inactivo':'activo',fotoIniciales:'QA',pin:'fixture-pin-preserved',cuentaAcceso:{create:{estado:'activa'}}}});cookies[index]=token(index);}
 await prisma.cuentaGoogle.create({data:{id:googleIds[0],subject:prefix+'-subject',email:prefix+'-0@example.invalid',nombre:'Prueba solicitante'}});
 await prisma.cuentaGoogle.create({data:{id:googleIds[1],subject:prefix+'-blocked-subject',email:prefix+'-blocked@example.invalid',nombre:'Prueba inactiva'}});
 const unknown=await request(null,'GET','/api/auth/google/status');assert.equal(typeof unknown.data.configured,'boolean');
 await request(null,'GET','/api/admin/cuentas/google',undefined,401);
 await request(2,'GET','/api/admin/cuentas/google',undefined,403);
 assert.equal((await request(1,'GET','/api/auth/me')).data.user.rolPrincipal,'administrativo');checks++;
 await request(1,'GET','/api/admin/cuentas/google');
 cookies.pending=token(2,{authProvider:'google',googleAccountId:googleIds[0]});
 await request('pending','GET','/api/auth/me',undefined,401);
 await request(2,'PATCH','/api/admin/cuentas/google',{id:googleIds[0],action:'approve',personaId:ids[2],rolAcceso:'administrativo'},403);
 await request(0,'PATCH','/api/admin/cuentas/google',{id:googleIds[1],action:'approve',personaId:ids[3],rolAcceso:'administrativo'},409);
 await request(0,'PATCH','/api/admin/cuentas/acceso',{personaId:ids[0],rolAcceso:'conductor'},409);
 await request(0,'PATCH','/api/admin/cuentas/acceso',{personaId:ids[2],rolAcceso:'hseq'},400);
 await request(0,'PATCH','/api/admin/cuentas/google',{id:googleIds[0],action:'approve',personaId:ids[2],rolAcceso:'conductor'});
 const linked=await prisma.cuentaGoogle.findUniqueOrThrow({where:{id:googleIds[0]}});assert.equal(linked.personaId,ids[2]);assert.equal(linked.estado,'aprobada');assert.equal(await prisma.cuentaGoogle.count({where:{personaId:ids[0]}}),0);checks++;
 const person=await prisma.persona.findUniqueOrThrow({where:{id:ids[2]},include:{cuentaAcceso:true}});assert.deepEqual(person.perfiles,['conductor']);assert.equal(person.pin,'fixture-pin-preserved');checks++;
 await request(2,'GET','/api/auth/me',undefined,401);
 cookies.google=token(2,{authProvider:'google',googleAccountId:googleIds[0]},person.cuentaAcceso.sessionVersion);
 assert.equal((await request('google','GET','/api/auth/me')).data.user.rolPrincipal,'conductor');checks++;
 await request('google','GET','/api/admin/cuentas/google',undefined,403);
 await request(0,'PATCH','/api/admin/cuentas/google',{id:googleIds[0],action:'revoke'});
 await request('google','GET','/api/auth/me',undefined,401);
 const revokedPerson=await prisma.cuentaAcceso.findUniqueOrThrow({where:{personaId:ids[2]}});cookies.revoked=token(2,{authProvider:'google',googleAccountId:googleIds[0]},revokedPerson.sessionVersion);
 await request('revoked','GET','/api/auth/me',undefined,401);
 await request(0,'PATCH','/api/admin/cuentas/acceso',{personaId:ids[2],rolAcceso:'administrativo'});
 const newVersion=await prisma.cuentaAcceso.findUniqueOrThrow({where:{personaId:ids[2]}});cookies.promoted=token(2,{},newVersion.sessionVersion);
 assert.equal((await request('promoted','GET','/api/auth/me')).data.user.rolPrincipal,'administrativo');checks++;
 await request('promoted','GET','/api/admin/cuentas/google');
 const preserved=await prisma.persona.findUniqueOrThrow({where:{id:ids[2]}});assert.deepEqual(preserved.perfiles,['conductor']);assert.equal(preserved.pin,'fixture-pin-preserved');checks++;
 console.log(JSON.stringify({passed:true,checks,scope:'aprobación y revocación administrativas, dos roles efectivos, bloqueo de cuentas Google pendientes, sin auto-vincular por correo ni alterar perfiles/credenciales; no prueba de proveedor real'}));
}finally{await prisma.$transaction(async tx=>{await tx.auditLog.deleteMany({where:{actorId:{in:ids}}});await tx.cuentaGoogle.deleteMany({where:{id:{in:googleIds}}});await tx.persona.deleteMany({where:{id:{in:ids}}});});await prisma.$disconnect();}
