import type {NextConfig} from "next";

const securityHeaders=[
  {key:"X-Content-Type-Options",value:"nosniff"},
  {key:"X-Frame-Options",value:"DENY"},
  {key:"Referrer-Policy",value:"strict-origin-when-cross-origin"},
  {key:"Permissions-Policy",value:"camera=(), microphone=(), geolocation=(), payment=()"},
  {key:"Strict-Transport-Security",value:"max-age=31536000; includeSubDomains; preload"},
];

const nextConfig:NextConfig={
  transpilePackages:["@attention-firewall/api","@attention-firewall/attention-engine","@attention-firewall/attention-runtime","@attention-firewall/auth-core","@attention-firewall/commitment-engine","@attention-firewall/intent-engine","@attention-firewall/local-analytics","@attention-firewall/model-calibration","@attention-firewall/personalization-engine","@attention-firewall/policy-engine","@attention-firewall/privacy-contract","@attention-firewall/recovery-engine","@attention-firewall/secure-browser-store","@attention-firewall/security-audit","@attention-firewall/security-core","@attention-firewall/sync-vault"],
  poweredByHeader:false,
  async headers(){return [{source:"/(.*)",headers:securityHeaders}];}
};

export default nextConfig;
