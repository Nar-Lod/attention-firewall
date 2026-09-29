export function hostPatterns(domains:string[]):string[]{
 return [...new Set(domains
  .map(domain=>domain.trim().toLowerCase().replace(/^www\\./,""))
  .filter(domain=>/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\\.)+[a-z]{2,63}$/.test(domain))
  .flatMap(domain=>[
   "https://"+domain+"/*",
   "https://*."+domain+"/*"
  ]))].slice(0,60);
}
