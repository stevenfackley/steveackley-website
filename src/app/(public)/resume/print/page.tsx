"use client";

import { useEffect } from "react";

const EMAIL = "stevenfackley@gmail.com";
const PHONE = "475-777-1139";
const LINKEDIN = "linkedin.com/in/stevenackley";
const GITHUB = "github.com/stevenfackley";
const LOCATION = "Derby, CT";

export default function ResumePrintPage() {
  useEffect(() => {
    // Small delay so the page renders fully before print dialog
    const t = setTimeout(() => window.print(), 600);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      {/* Print trigger button - hidden when printing */}
      <div className="no-print fixed top-4 right-4 z-50 flex gap-2">
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-lg"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Save as PDF
        </button>
        <a
          href="/resume"
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors shadow-lg"
        >
          Back
        </a>
      </div>

      {/* Resume Document */}
      <div id="resume-doc" className="resume-doc">
        {/* Header */}
        <header className="doc-header">
          <div className="doc-name-block">
            <h1 className="doc-name">Steve Ackley</h1>
            <p className="doc-title">Staff Software Engineer</p>
          </div>
          <div className="doc-contact">
            <span>{PHONE}</span>
            <span className="doc-sep">|</span>
            <a href={`mailto:${EMAIL}`}>{EMAIL}</a>
            <span className="doc-sep">|</span>
            <span>{LOCATION}</span>
            <span className="doc-sep">|</span>
            <span>{LINKEDIN}</span>
            <span className="doc-sep">|</span>
            <span>{GITHUB}</span>
          </div>
        </header>

        {/* Summary */}
        <section className="doc-section">
          <h2 className="doc-section-title">Professional Summary</h2>
          <p className="doc-text">
            Results-driven Staff Software Engineer at Lockheed Martin with 12+ years of enterprise software
            experience across defense, energy, and healthcare sectors. Deep specialization in the Microsoft
            technology stack including C# / .NET 10, ASP.NET Core, SQL Server, Azure, and Angular. Proven
            track record architecting and delivering mission-critical systems under strict quality and compliance
            standards. Certified SOA Architect with demonstrated ability to lead cross-functional engineering
            teams, drive coding standards, and deliver on time at scale.
          </p>
        </section>

        {/* Experience */}
        <section className="doc-section">
          <h2 className="doc-section-title">Work Experience</h2>

          <div className="doc-job">
            <div className="doc-job-header">
              <div>
                <span className="doc-company">Lockheed Martin</span>
                <span className="doc-job-location"> &mdash; Shelton, CT</span>
              </div>
              <span className="doc-date">December 2020 &ndash; Present</span>
            </div>

            <div className="doc-role-block">
              <p className="doc-role">Staff Software Engineer <span className="doc-role-date">(May 2022 &ndash; Present)</span></p>
              <ul className="doc-bullets">
                <li>Spearheaded ground-up development of a web-based Interactive Electronic Technical Manual (IETM) platform for the F-16 fighter aircraft, modernizing legacy documentation workflows with a browser-native, containerized solution.</li>
                <li>Maintained a 95% on-schedule delivery rate across multiple release cycles while consistently meeting defense-grade quality thresholds.</li>
                <li>Established and enforced structured code review processes that drove a 50% reduction in post-merge defects across the engineering team.</li>
                <li><strong>Stack:</strong> Angular, ASP.NET Core, C#, AWS, Node.js, PostgreSQL, SQLite, Docker, GitLab CI/CD</li>
              </ul>
            </div>

            <div className="doc-role-block">
              <p className="doc-role">Senior Software Engineer <span className="doc-role-date">(December 2020 &ndash; May 2022)</span></p>
              <ul className="doc-bullets">
                <li>Architected and delivered a disconnected desktop-based IETM application for the HH-60W Combat Rescue Helicopter with real-time bidirectional synchronization to cloud-hosted USAF IMDS infrastructure via SymmetricDS.</li>
                <li>Scaled cross-functional ownership by leading a 10-engineer team, consistently exceeding performance benchmarks and driving a 20% productivity uplift quarter-over-quarter.</li>
                <li>Authored engineering coding standards and documentation adopted across a shared 30-engineer monorepo, reducing onboarding friction and improving consistency.</li>
                <li><strong>Stack:</strong> WPF, C#, XAML, SQL Server, SQLite, SymmetricDS, Jenkins, Bitbucket, Azure</li>
              </ul>
            </div>
          </div>

          <div className="doc-job">
            <div className="doc-job-header">
              <div>
                <span className="doc-company">Flexi Software</span>
                <span className="doc-job-location"> &mdash; Shelton, CT</span>
              </div>
              <span className="doc-date">July 2020 &ndash; December 2020</span>
            </div>
            <p className="doc-role">Software Architect</p>
            <ul className="doc-bullets">
              <li>Designed and delivered a cloud-hosted SaaS license authorization and distribution platform from concept to production, serving as the sole principal engineer on system architecture.</li>
              <li>Produced comprehensive technical specifications from raw business requirements, coordinating a globally distributed team of 15+ engineers across three office locations, two countries, and two time zones.</li>
              <li><strong>Stack:</strong> ASP.NET Core, C#, Azure, Azure DevOps, C++, WPF</li>
            </ul>
          </div>

          <div className="doc-job">
            <div className="doc-job-header">
              <div>
                <span className="doc-company">Sila Solutions Group</span>
                <span className="doc-job-location"> &mdash; Shelton, CT</span>
              </div>
              <span className="doc-date">September 2016 &ndash; July 2020</span>
            </div>
            <p className="doc-role">Sr. Specialist, Software Engineering & Integration, DevOps</p>
            <ul className="doc-bullets">
              <li>Embedded consulting engineer at Lockheed Martin / Sikorsky Aircraft, contributing to mission-critical IETM software for the HH-60W Combat Rescue Helicopter across a multi-year engagement.</li>
              <li>Introduced and drove agile development practices across the team, resulting in a measurable 15% improvement in team throughput and delivery predictability.</li>
              <li><strong>Stack:</strong> WPF, C#, XAML, SQL Server, SQLite, SymmetricDS, Jenkins, GitLab</li>
            </ul>
          </div>

          <div className="doc-job">
            <div className="doc-job-header">
              <div>
                <span className="doc-company">Emerson Process Management</span>
                <span className="doc-job-location"> &mdash; Watertown, CT</span>
              </div>
              <span className="doc-date">May 2014 &ndash; September 2016</span>
            </div>
            <p className="doc-role">.NET Developer / Junior Developer</p>
            <ul className="doc-bullets">
              <li>Owned ongoing maintenance and feature development for Catapult, a proprietary Enterprise Asset Management (EAM) platform serving oil and gas reliability consulting clients.</li>
              <li>Engineered a RESTful Web API service integrated into every Catapult installation, and architected a KPI analytics web application using MVC5, Entity Framework, Bootstrap, and n-tier architecture patterns.</li>
              <li><strong>Stack:</strong> C#, ASP.NET MVC, Web API, SQL Server, WinForms, Entity Framework, jQuery, Bootstrap</li>
            </ul>
          </div>

          <div className="doc-job">
            <div className="doc-job-header">
              <div>
                <span className="doc-company">SMC Partners, LLC</span>
                <span className="doc-job-location"> &mdash; Healthcare Consulting</span>
              </div>
              <span className="doc-date">January 2013 &ndash; June 2014</span>
            </div>
            <p className="doc-role">Computer Programmer / Analyst</p>
            <ul className="doc-bullets">
              <li>Delivered healthcare technology consulting across multiple clients. Led development of a modern C# / ASP.NET web application replacing a legacy VB6 QA auditing system at Connecticare (CT), implementing bit-mask role-based security and stored procedure-driven data access.</li>
              <li>Supported data warehouse implementation and SSRS report rationalization at Hometown Health (NV), consolidating a fragmented reporting estate by 40% while improving accuracy and maintainability.</li>
              <li><strong>Stack:</strong> C#, ASP.NET, WCF, SQL Server, SSRS, jQuery, AJAX</li>
            </ul>
          </div>
        </section>

        {/* Skills */}
        <section className="doc-section">
          <h2 className="doc-section-title">Technical Skills</h2>
          <table className="doc-skills-table">
            <tbody>
              <tr>
                <td className="doc-skill-label">Microsoft Backend</td>
                <td>C# / .NET 10, ASP.NET Core, Web API, WPF, XAML, ML.NET, Entity Framework Core, SignalR</td>
              </tr>
              <tr>
                <td className="doc-skill-label">Data & Reporting</td>
                <td>SQL Server (advanced T-SQL), SSIS, SSAS, SSRS, Tableau, PostgreSQL, SQLite, Data Warehousing</td>
              </tr>
              <tr>
                <td className="doc-skill-label">Cloud & DevOps</td>
                <td>Azure (App Service, Functions, Service Bus, Key Vault, AKS), Azure DevOps, AWS, Docker, Kubernetes, Jenkins, GitLab CI/CD</td>
              </tr>
              <tr>
                <td className="doc-skill-label">Frontend</td>
                <td>Angular (primary), TypeScript, React / Next.js, CSS, SCSS, Bootstrap, Tailwind CSS</td>
              </tr>
              <tr>
                <td className="doc-skill-label">Architecture</td>
                <td>SOA, Microservices, Clean Architecture, DDD, REST, WCF, SymmetricDS, Disconnected Systems</td>
              </tr>
              <tr>
                <td className="doc-skill-label">Tools</td>
                <td>Git, GitHub, GitLab, Bitbucket, Jira, Scrum / Agile, xUnit, NUnit, C++, Node.js</td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* Certifications */}
        <section className="doc-section">
          <h2 className="doc-section-title">Certifications</h2>
          <div className="doc-certs">
            <div className="doc-cert">
              <span className="doc-cert-name">Certified SOA Architect</span>
              <span className="doc-cert-issuer">Arcitura Education &mdash; 2018</span>
            </div>
            <div className="doc-cert">
              <span className="doc-cert-name">Microsoft Technology Associate (MCPS &mdash; Software Development)</span>
              <span className="doc-cert-issuer">Microsoft &mdash; 2014</span>
            </div>
          </div>
        </section>

        {/* Education */}
        <section className="doc-section">
          <h2 className="doc-section-title">Education</h2>
          <div className="doc-job">
            <div className="doc-job-header">
              <div>
                <span className="doc-company">Central Connecticut State University</span>
                <span className="doc-job-location"> &mdash; New Britain, CT</span>
              </div>
              <span className="doc-date">2016</span>
            </div>
            <p className="doc-role">Bachelor of Science, Computer Science &mdash; Minor: Management Information Systems</p>
          </div>
          <div className="doc-job" style={{ marginBottom: 0 }}>
            <div className="doc-job-header">
              <div>
                <span className="doc-company">Naugatuck Valley Community College</span>
              </div>
              <span className="doc-date">2012</span>
            </div>
            <p className="doc-role">Associate of Science, Computer Science</p>
          </div>
        </section>
      </div>

      <style>{`
        /* ── Page setup ── */
        @page {
          size: letter;
          margin: 0.65in 0.7in;
        }

        * { box-sizing: border-box; }

        body {
          background: #f4f4f5;
          font-family: 'Georgia', 'Times New Roman', serif;
        }

        /* ── Document wrapper ── */
        .resume-doc {
          max-width: 8.5in;
          margin: 2rem auto 4rem;
          background: #ffffff;
          box-shadow: 0 4px 32px rgba(0,0,0,0.18);
          padding: 0.7in 0.75in;
          color: #1a1a1a;
          font-size: 10.5pt;
          line-height: 1.45;
        }

        /* ── Header ── */
        .doc-header {
          border-bottom: 2.5px solid #1e3a8a;
          padding-bottom: 0.55rem;
          margin-bottom: 0.75rem;
        }
        .doc-name-block { margin-bottom: 0.25rem; }
        .doc-name {
          font-size: 24pt;
          font-weight: 700;
          letter-spacing: 0.02em;
          color: #0f172a;
          line-height: 1.1;
          font-family: 'Arial', 'Helvetica Neue', sans-serif;
        }
        .doc-title {
          font-size: 11pt;
          color: #1e3a8a;
          font-family: 'Arial', 'Helvetica Neue', sans-serif;
          font-weight: 600;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          margin-top: 0.1rem;
        }
        .doc-contact {
          font-size: 8.5pt;
          color: #4b5563;
          font-family: 'Arial', 'Helvetica Neue', sans-serif;
          margin-top: 0.3rem;
          display: flex;
          flex-wrap: wrap;
          gap: 0.25rem;
          align-items: center;
        }
        .doc-contact a { color: #1e3a8a; text-decoration: none; }
        .doc-sep { color: #9ca3af; font-size: 8pt; }

        /* ── Section ── */
        .doc-section { margin-bottom: 0.75rem; }
        .doc-section-title {
          font-size: 10pt;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: #1e3a8a;
          font-family: 'Arial', 'Helvetica Neue', sans-serif;
          border-bottom: 1px solid #bfdbfe;
          padding-bottom: 0.2rem;
          margin-bottom: 0.5rem;
        }
        .doc-text {
          font-size: 9.5pt;
          color: #374151;
          line-height: 1.5;
        }

        /* ── Job entries ── */
        .doc-job { margin-bottom: 0.65rem; }
        .doc-job-header {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          margin-bottom: 0.1rem;
        }
        .doc-company {
          font-weight: 700;
          font-size: 10pt;
          color: #0f172a;
          font-family: 'Arial', 'Helvetica Neue', sans-serif;
        }
        .doc-job-location {
          font-size: 9pt;
          color: #6b7280;
        }
        .doc-date {
          font-size: 9pt;
          color: #6b7280;
          white-space: nowrap;
          font-style: italic;
        }
        .doc-role {
          font-size: 9.5pt;
          font-style: italic;
          color: #374151;
          margin-bottom: 0.25rem;
          font-family: 'Arial', 'Helvetica Neue', sans-serif;
        }
        .doc-role-date {
          font-size: 8.5pt;
          color: #6b7280;
          font-weight: 400;
        }
        .doc-role-block { margin-bottom: 0.35rem; }
        .doc-bullets {
          margin: 0.15rem 0 0 0;
          padding-left: 1.1rem;
          font-size: 9.5pt;
          color: #374151;
          line-height: 1.5;
        }
        .doc-bullets li { margin-bottom: 0.2rem; }

        /* ── Skills table ── */
        .doc-skills-table { width: 100%; border-collapse: collapse; font-size: 9.5pt; }
        .doc-skills-table td { vertical-align: top; padding: 0.15rem 0.4rem 0.15rem 0; line-height: 1.45; }
        .doc-skill-label {
          font-weight: 700;
          color: #0f172a;
          white-space: nowrap;
          width: 140px;
          font-family: 'Arial', 'Helvetica Neue', sans-serif;
          font-size: 9pt;
        }

        /* ── Certifications ── */
        .doc-certs { display: flex; flex-direction: column; gap: 0.3rem; }
        .doc-cert { display: flex; justify-content: space-between; align-items: baseline; font-size: 9.5pt; }
        .doc-cert-name { font-weight: 600; color: #0f172a; }
        .doc-cert-issuer { font-style: italic; color: #6b7280; font-size: 9pt; }

        /* ── Print styles ── */
        @media print {
          body { background: white; }
          .no-print { display: none !important; }
          .resume-doc {
            max-width: none;
            margin: 0;
            padding: 0;
            box-shadow: none;
            font-size: 10pt;
          }
          .doc-header { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .doc-section-title { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .doc-job { page-break-inside: avoid; }
        }

        /* ── Screen only: look nice on screen too ── */
        @media screen {
          .resume-doc {
            border-top: 4px solid #1e3a8a;
          }
        }
      `}</style>
    </>
  );
}
