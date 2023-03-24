module.exports = {
  siteUrl: process.env.SITE_URL || "https://quantumbridge.app",
  generateRobotsTxt: true,
  robotsTxtOptions: {
    policies: [
      {
        userAgent: "*",
        allow: "/",
        disallow: "/*?network=*",
      },
    ],
  },
};
