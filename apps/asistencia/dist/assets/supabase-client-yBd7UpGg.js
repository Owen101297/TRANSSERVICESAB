import{createClient as f}from"https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";(function(){const r=document.createElement("link").relList;if(r&&r.supports&&r.supports("modulepreload"))return;for(const t of document.querySelectorAll('link[rel="modulepreload"]'))i(t);new MutationObserver(t=>{for(const s of t)if(s.type==="childList")for(const c of s.addedNodes)c.tagName==="LINK"&&c.rel==="modulepreload"&&i(c)}).observe(document,{childList:!0,subtree:!0});function o(t){const s={};return t.integrity&&(s.integrity=t.integrity),t.referrerPolicy&&(s.referrerPolicy=t.referrerPolicy),t.crossOrigin==="use-credentials"?s.credentials="include":t.crossOrigin==="anonymous"?s.credentials="omit":s.credentials="same-origin",s}function i(t){if(t.ep)return;t.ep=!0;const s=o(t);fetch(t.href,s)}})();const u=""+new URL("logo-Ccvc_zFC.png",import.meta.url).href,n={name:"Trans Services A&B",subtitle:"Sistema de Gestión HSEQ",nit:"901.000.000-0",logo:u};function h(e,r=n.subtitle){const o=document.getElementById(e);o&&(o.innerHTML=`
        <div class="bg-blue-900 p-6 text-center">
            <div class="inline-block bg-white p-2 rounded-lg mb-3 shadow-lg">
                <img src="${n.logo}" alt="${n.name} Logo" class="h-16 mx-auto">
            </div>
            <h1 class="text-white font-bold text-lg">${n.name}</h1>
            <p class="text-blue-200 text-sm">${r}</p>
        </div>
    `)}function v(){return`
        <div class="grid grid-cols-[140px_1fr_140px] min-h-[70px]">
            <div class="border-r border-black p-1 flex flex-col items-center justify-center text-center">
                <img src="${n.logo}" alt="Logo" class="h-12 w-auto mb-1">
                <div class="text-[7px] font-bold">${n.name}</div>
                <div class="text-[6px]">NIT: ${n.nit}</div>
            </div>
            <div class="flex flex-col">
                <div class="h-1/2 flex items-center justify-center border-b border-black font-bold text-sm">
                    GESTION DE RECURSOS HUMANOS</div>
                <div class="h-1/2 flex items-center justify-center font-bold text-lg">REGISTRO DE ASISTENCIA
                </div>
            </div>
            <div class="border-l border-black text-[8px] text-center flex flex-col">
                <div class="flex-1 flex items-center justify-center border-b border-black font-bold">GRRHH-F-007
                </div>
                <div class="flex-1 flex flex-col justify-center border-b border-black px-1">
                    <span class="font-bold">Aprobación:</span> 01/09/2024
                </div>
                <div class="flex-1 flex items-center justify-center font-bold bg-gray-100">Ver: 02</div>
            </div>
        </div>
    `}const m=()=>({url:"https://xftllyjjqvozjjmgwomg.supabase.co",key:"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmdGxseWpqcXZvempqbWd3b21nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyMjExMTIsImV4cCI6MjA5Mzc5NzExMn0.UURzZOytfoYMrxzpohRams_GcJ3ETsEnNNOaSQqeuu8"}),{url:b,key:p}=m(),l=f(b,p),g=[()=>l.schema("operacion").from("asistencia"),()=>l.from("asistencia")];let a=null;async function d(){if(a)return a();for(const e of g)try{const{error:r}=await e().select("id",{count:"exact",head:!0});if(!r)return a=e,e()}catch{}throw new Error("No se pudo acceder a la tabla de asistencia")}function y(e=new Date){const r=e.getFullYear(),o=String(e.getMonth()+1).padStart(2,"0"),i=String(e.getDate()).padStart(2,"0");return`${r}-${o}-${i}`}function S(e=new Date){return e.toTimeString().slice(0,8)}async function I(e){const r=await d(),{data:o,error:i}=await r.select("*").eq("fecha",e).order("hora_llegada");if(i)throw i;return o||[]}async function E(e){const r=await d(),{data:o,error:i}=await r.insert(e).select().single();if(i)throw i;return o}export{v as a,d as b,E as c,y as f,I as g,S as h,h as r};
