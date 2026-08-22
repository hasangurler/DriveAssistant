const NS="http://www.w3.org/2000/svg";
const cx=300, cy=215, maxSpeed=240;
const startAngle=-130, endAngle=130;
const arcRadius=245;
const labelRadius=202;
const needleInner=140, needleOuter=225;

const ticks=document.getElementById("ticks");
const labels=document.getElementById("labels");
const needle=document.getElementById("needle");
const digital=document.getElementById("digitalSpeed");
const slider=document.getElementById("speedSlider");
const testValue=document.getElementById("testValue");

function polar(r,a){
  const rad=(a-90)*Math.PI/180;
  return {x:cx+r*Math.cos(rad),y:cy+r*Math.sin(rad)};
}
function svg(tag,attrs){
  const e=document.createElementNS(NS,tag);
  Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,v));
  return e;
}
function arcPath(r,a1,a2){
  const p1=polar(r,a2),p2=polar(r,a1);
  return `M ${p1.x} ${p1.y} A ${r} ${r} 0 ${Math.abs(a2-a1)<=180?0:1} 0 ${p2.x} ${p2.y}`;
}
function buildGauge(){
  const p1=polar(248,startAngle),p2=polar(248,endAngle);
  document.getElementById("gaugeFace").setAttribute(
    "d",`M ${p1.x} ${p1.y} A 248 248 0 0 0 ${p2.x} ${p2.y} L ${cx} ${cy} Z`
  );
  document.getElementById("gaugeArc").setAttribute("d",arcPath(arcRadius,startAngle,endAngle));

  for(let s=0;s<=maxSpeed;s+=10){
    const a=startAngle+s/maxSpeed*(endAngle-startAngle);
    const major=s%20===0;
    const po=polar(major?239:239,a);
    const pi=polar(major?220:228,a);
    ticks.appendChild(svg("line",{x1:pi.x,y1:pi.y,x2:po.x,y2:po.y,class:major?"tick-major":"tick-minor"}));
  }

  for(let s=0;s<=maxSpeed;s+=20){
    const a=startAngle+s/maxSpeed*(endAngle-startAngle);
    const p=polar(labelRadius,a);
    const t=svg("text",{x:p.x,y:p.y+7,class:"speed-label"});
    t.setAttribute("text-anchor","middle");
    t.textContent=s;
    labels.appendChild(t);
  }
}
function speedAngle(speed){
  speed=Math.max(0,Math.min(maxSpeed,Number(speed)||0));
  return startAngle+speed/maxSpeed*(endAngle-startAngle);
}
function setSpeed(speed){
  speed=Math.max(0,Math.min(maxSpeed,Number(speed)||0));
  const a=speedAngle(speed);
  const p1=polar(needleInner,a),p2=polar(needleOuter,a);
  needle.setAttribute("x1",p1.x);
  needle.setAttribute("y1",p1.y);
  needle.setAttribute("x2",p2.x);
  needle.setAttribute("y2",p2.y);
  const v=Math.round(speed);
  digital.textContent=v;
  testValue.textContent=`${v} km/h`;
}
slider.addEventListener("input",e=>setSpeed(e.target.value));
buildGauge();
setSpeed(0);
