import { shieldGrid } from "../../../apps/web/src/art/shield";
import { shade } from "../../../apps/web/src/art/tiles";
import { FRAY_SPRITES } from "../../../apps/web/src/art/sprites";
import { renderWorld } from "../../../apps/web/src/art/world";
import { makeGeo } from "../../../apps/web/src/art/grid";
import { generateMap } from "../../../packages/engine/src/mapgen";
import { GRID } from "../../../packages/engine/src/rules";
import { writeFileSync } from "fs";
const ENAMEL:Record<string,string>={gules:"#B3291D",azur:"#1B3C80",sinople:"#246B2A",sable:"#1E1E24",purpura:"#A23C9E",naranjado:"#A84E0F",aguamarina:"#0E6A6E",leonado:"#4E2F18"};
const METAL:any={oro:["#E8B83A","#A97E14"],plata:["#E6E6E6","#9A9AA3"]};
const H=[["Duques del Queso","naranjado","rodela","cortado","queso","oro","sable","Curado y sin prisa"],["Señores del Pato","azur","apuntado","pleno","pato","plata",null,"Cuac"],["Los Pocapena","gules","espanol","partido","leon","oro","oro","Ni una lágrima"],["Gallina Bélica","sinople","almendrado","tronchado","gallina","oro","leonado","Primero el huevo"],["Barones del Barro","leonado","estandarte","pleno","cerdo","oro",null,"Hasta las rodillas"],["Caracol Veloz","aguamarina","espanol","cortado","caracol","plata","purpura","Llegaremos"],["Casa del Nabo","purpura","apuntado","partido","nabo","oro","sinople","Humilde raíz"]] as const;
const houses=H.map(([n,c,sh,dv,sy,mt,c2,lema])=>{const a=ENAMEL[c]!,b=c2&&ENAMEL[c2]?ENAMEL[c2]!:a,m=METAL[mt];return {n,lema,color:a,grid:shieldGrid(sh as any,(c2?dv:"pleno") as any,sy as any),pal:{k:"#1a1410",a,b,A:shade(a,.28),B:shade(b,.28),c:shade(a,-.3),d:shade(b,-.3),m:m[0],n:m[1],x:"#1a1410"}};});
const ap="#5b2a86";const kingShield={grid:shieldGrid("espanol","pleno","corona"),pal:{k:"#1a1410",a:ap,b:ap,A:shade(ap,.28),B:shade(ap,.28),c:shade(ap,-.3),d:shade(ap,-.3),m:"#E8B83A",n:"#A97E14",x:"#1a1410"}};
const ids=[1,2,3,4,5,6,7];const gm=generateMap("aldricia-cine",ids);
const geo=makeGeo(GRID.kind as any,gm.cols,gm.rows,20);
const cells=gm.tiles.map((t:any)=>({x:t.x,y:t.y,type:t.type,owner:t.owner??null,poly:geo.outline(t.x,t.y,1).map(([a,b])=>[Math.round(a*10)/10,Math.round(b*10)/10]),c:geo.center(t.x,t.y)}));
// territorio semana a semana (inventado, determinista)
let s=12345;const rnd=()=>{s=(s*1103515245+12345)&0x7fffffff;return s/0x7fffffff;};
const key=(x:number,y:number)=>x+","+y;const idx=new Map(cells.map((c,i)=>[key(c.x,c.y),i]));
let own=cells.map(c=>c.type==="castillo"?c.owner:null);
const weeks:(number|null)[][]=[own.slice()];
const strength=[1.6,1.3,1.1,1.25,0.9,0.7,0.8];
for(let w=1;w<=6;w++){const next=own.slice();
 for(let h=1;h<=7;h++){const mine=cells.map((c,i)=>i).filter(i=>own[i]===h);const front=new Set<number>();
  for(const i of mine)for(const [nx,ny] of geo.neighbours(cells[i]!.x,cells[i]!.y)){const j=idx.get(key(nx,ny));if(j!=null&&own[j]!==h&&cells[j]!.type!=="castillo"&&cells[j]!.type!=="paramo")front.add(j);}
  const f=[...front].sort(()=>rnd()-.5);const take=Math.round(strength[h-1]!*(1+rnd()*1.2));
  for(const j of f.slice(0,take)){if(own[j]==null||rnd()<strength[h-1]!/(strength[(own[j]!)-1]!+strength[h-1]!))next[j]=h;}}
 own=next;weeks.push(own.slice());}
const counts=weeks[6]!.reduce((a:any,o)=>{if(o)a[o]=(a[o]||0)+1;return a;},{});
const neutral=renderWorld({cols:gm.cols,rows:gm.rows,cells:cells.map(c=>({x:c.x,y:c.y,type:c.type,owner:null})),margin:20});
const colored=renderWorld({cols:gm.cols,rows:gm.rows,cells:cells.map(c=>({x:c.x,y:c.y,type:c.type,owner:c.owner?houses[c.owner-1]!.color:null})),margin:20});
writeFileSync("data.json",JSON.stringify({houses,kingShield,fray:FRAY_SPRITES,map:{w:neutral.width,h:neutral.height,pN:neutral.pixels,palN:neutral.palette,pC:colored.pixels,palC:colored.palette,cells:cells.map(c=>({poly:c.poly,c:c.c,t:c.type,o:c.owner})),weeks}}));
console.log(neutral.width,neutral.height,JSON.stringify(counts));
