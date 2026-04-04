import { redirect } from "next/navigation";
import { getSession } from "../lib/session";
import Link from "next/link";
import Image from "next/image";
import { Calendar, Bird, Sparkles, Camera } from "lucide-react";
import styles from "./landing.module.css";

export default async function Home() {
  const session = await getSession();
  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className={styles.page}>
      {/* Navigation */}
      <nav className={styles.nav}>
        <div className={styles.navBrand}>
          <Image src="/logo.svg" alt="Bird Cage" width={48} height={32} />
          <span className={styles.navTitle}>Bird Cage</span>
        </div>
        <div className={styles.navActions}>
          <Link href="/login" className={styles.loginBtn}>Log In</Link>
          <Link href="/signup" className={styles.signupBtn}>Sign Up Free</Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.heroText}>
            <p className={styles.heroBadge}>For serious birding enthusiasts</p>
            <h1 className={styles.heroHeadline}>
              Track Every Bird.<br />
              <span className={styles.heroAccent}>Remember Every Moment.</span>
            </h1>
            <p className={styles.heroDescription}>
              Bird Cage is the ultimate companion for birding enthusiasts. Log your outings,
              record every species you encounter, and let AI identify birds from your descriptions
              or photos — all in one beautiful app.
            </p>
            <div className={styles.heroCta}>
              <Link href="/signup" className={styles.ctaPrimary}>Get Started Free</Link>
              <Link href="/login" className={styles.ctaSecondary}>Already a member? Sign in</Link>
            </div>
          </div>
          <div className={styles.heroImageWrapper}>
            <div className={styles.heroImageCard}>
              <Image
                src="/logo.svg"
                alt="Bird Cage — track your birding adventures"
                width={280}
                height={188}
                className={styles.heroLogo}
              />
              <div className={styles.heroBirdBadge}>
                <Bird size={16} />
                <span>500+ species identified</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className={styles.features}>
        <div className={styles.featuresInner}>
          <h2 className={styles.featuresTitle}>Everything a birder needs</h2>
          <p className={styles.featuresSubtitle}>
            From casual outings to serious expeditions, Bird Cage has you covered.
          </p>
          <div className={styles.featureGrid}>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon} style={{ background: "#e8f4fb" }}>
                <Calendar size={28} color="#209dd7" />
              </div>
              <h3 className={styles.featureCardTitle}>Create Birding Events</h3>
              <p className={styles.featureCardDesc}>
                Log each outing with date, location, and notes. Build a rich history of your
                birding adventures over time.
              </p>
            </div>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon} style={{ background: "#fef9e6" }}>
                <Bird size={28} color="#ecad0a" />
              </div>
              <h3 className={styles.featureCardTitle}>Multiple Bird Sightings</h3>
              <p className={styles.featureCardDesc}>
                Record as many bird sightings as you spot per event. Capture species, behavior,
                GPS coordinates, and more for each encounter.
              </p>
            </div>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon} style={{ background: "#f3eaf7" }}>
                <Sparkles size={28} color="#753991" />
              </div>
              <h3 className={styles.featureCardTitle}>AI Identification by Description</h3>
              <p className={styles.featureCardDesc}>
                Describe what you see — plumage, size, behavior, call — and our AI instantly
                identifies the species with detailed information.
              </p>
            </div>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon} style={{ background: "#e8f4fb" }}>
                <Camera size={28} color="#209dd7" />
              </div>
              <h3 className={styles.featureCardTitle}>AI Identification by Photo</h3>
              <p className={styles.featureCardDesc}>
                Snap a photo and let AI do the rest. Upload your bird photo and get an instant
                species identification with confidence rating.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* AI Demo Section */}
      <section className={styles.demo}>
        <div className={styles.demoInner}>
          <div className={styles.demoText}>
            <h2 className={styles.demoTitle}>
              See AI identification <span className={styles.demoAccent}>in action</span>
            </h2>
            <p className={styles.demoDesc}>
              Just describe what you see and Bird Cage's AI gives you a complete species
              identification — instantly.
            </p>
            <ul className={styles.demoFeatureList}>
              <li>Species name and family</li>
              <li>Detailed description and field marks</li>
              <li>Habitat and behavior notes</li>
              <li>Conservation status</li>
            </ul>
          </div>
          <div className={styles.demoChatCard}>
            <div className={styles.demoChatHeader}>
              <Bird size={16} color="#209dd7" />
              <span>Bird ID Assistant</span>
            </div>
            <div className={styles.demoChatMessages}>
              <div className={styles.demoChatUser}>
                <div className={styles.demoChatBubbleUser}>
                  I spotted a medium-sized bird with a bright red breast, dark gray back,
                  orange beak, and a melodic song. It was hopping along the lawn.
                </div>
              </div>
              <div className={styles.demoChatAi}>
                <div className={styles.demoChatBubbleAi}>
                  <p className={styles.demoAiSpecies}>🐦 American Robin</p>
                  <p className={styles.demoAiScientific}>
                    <em>Turdus migratorius</em>
                  </p>
                  <p>
                    The American Robin is one of North America's most familiar birds, known
                    for its cheerful song and orange-red breast. It's a member of the thrush
                    family and is commonly found in lawns, parks, and open woodlands.
                  </p>
                  <div className={styles.demoAiTag}>Confidence: High ✓</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className={styles.ctaSection}>
        <div className={styles.ctaInner}>
          <h2 className={styles.ctaTitle}>Ready to start your birding journey?</h2>
          <p className={styles.ctaDesc}>
            Join thousands of birding enthusiasts logging their discoveries every day.
          </p>
          <div className={styles.ctaButtons}>
            <Link href="/signup" className={styles.ctaPrimary}>Create Free Account</Link>
            <Link href="/login" className={styles.ctaSecondaryDark}>Sign In</Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerBrand}>
            <Image src="/logo.svg" alt="Bird Cage" width={32} height={22} />
            <span>Bird Cage</span>
          </div>
          <p className={styles.footerCopy}>
            &copy; {new Date().getFullYear()} Bird Cage. Made for birding enthusiasts.
          </p>
        </div>
      </footer>
    </div>
  );
}
