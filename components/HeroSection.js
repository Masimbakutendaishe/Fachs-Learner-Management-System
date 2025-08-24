import { useEffect, useRef } from 'react';

const services = [
  {
    title: 'Project Management',
    desc: `We expertly coordinate every stage of your projects—from planning and scheduling to execution and delivery—ensuring timelines and budgets are met. Embedded within our workflows are automation tools providing real-time progress tracking and predictive analytics.`,
    img: 'main1.jpg',
  },
  {
    title: 'Logistics & Transport',
    desc: `Comprehensive logistics services including warehousing, inventory, freight handling, and nationwide transport. Enhanced with sensor systems monitoring cargo and smart routing algorithms cutting costs and delivery times.`,
    img: 'main3.jpg',
  },
  {
    title: 'Fleet Tracking & Security',
    desc: `Fleet equipped with GPS and IoT sensors delivering live location updates, vehicle health monitoring, and security threat detection. Proactive maintenance and theft prevention ensure secure, timely deliveries.`,
    img: 'main2.png',
  },
];

const HeroSection = () => {
  const cardsRef = useRef([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('reveal');
          }
        });
      },
      { threshold: 0.15 }
    );

    cardsRef.current.forEach((card) => {
      if (card) observer.observe(card);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <>
      <style jsx>{`
        .hero {
          background: white;
          color: white;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          position: relative;
          overflow-x: hidden;
        }

        .intro-section {
          background-image: url('/truck1.jpg');
          background-size: cover;
          background-position: center;
          height: 88vh;
          padding: 3rem 2rem;
          text-align: center;
          box-shadow: inset 0 0 0 2000px rgba(0, 24, 48, 0.7);
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .intro-section h1 {
          font-size: 3.2rem;
          font-weight: 900;
          margin-bottom: 0.5rem;
          color: white;
        }

        .intro-section p.description {
          font-size: 1.3rem;
          line-height: 1.5;
          color: #eee;
          max-width: 700px;
          margin: 0 auto;
        }

        .scrolling-text-container {
          position: relative;
          width: 100%;
          background: linear-gradient(145deg, #6e0000, #8b0000, #7a0000, #5e0000);
          padding: 0.2rem 0;
          border-top: 1px solid #8b0000;
          border-bottom: 1px solid #8b0000;
          text-align: center;
          height: 2rem;
          overflow: hidden;
          z-index: 2;
        }

        .scrolling-text {
          display: inline-block;
          padding-left: 100%;
          white-space: nowrap;
          animation: scrollLeft 25s linear infinite;
          font-weight: 600;
          font-size: 1rem;
          color: white;
          line-height: 2rem;
          text-shadow: 1px 1px 2px #400000, 0 0 6px #ff4136aa;
        }

        @keyframes scrollLeft {
          0% {
            transform: translateX(0%);
          }
          100% {
            transform: translateX(-100%);
          }
        }

        .services-container {
          padding: 1rem 1rem 5rem;
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 2rem;
          background-color: white;
        }

        .service-card {
          opacity: 0;
          transform: translateY(60px);
          transition: all 0.6s ease, transform 0.3s ease, box-shadow 0.3s ease;
          background: #0a244d;
          box-shadow: 0 10px 20px rgba(0, 0, 128, 0.5);
          width: 320px;
          color: white;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 0;
          border-radius: 0;
        }

        .service-card:hover {
          transform: scale(1.05) translateY(-5px);
          box-shadow: 0 20px 30px rgba(0, 0, 128, 0.6);
        }

        .service-card.reveal {
          opacity: 1;
          transform: translateY(0);
        }

        .service-image {
          width: 100%;
          height: 33%;
          object-fit: cover;
          border-radius: 0;
        }

        .card-content {
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          height: 67%;
        }

        .service-card h3 {
          font-size: 1.5rem;
          margin-bottom: 0.7rem;
          color: #d1e8ff;
          text-align: center;
        }

        .service-desc {
          font-size: 1rem;
          line-height: 1.4;
          text-align: center;
          color: #eee;
        }

        @media (max-width: 768px) {
          .intro-section h1 {
            font-size: 2.4rem;
          }
          .intro-section p.description {
            font-size: 1.1rem;
          }
          .service-card {
            width: 90%;
          }
        }

        @media (max-width: 480px) {
          .scrolling-text {
            font-size: 0.9rem;
          }
          .intro-section {
            height: 80vh;
            padding: 2rem 1rem;
          }
          .intro-section h1 {
            font-size: 1.8rem;
          }
        }
      `}</style>

      <section className="hero">
        <div className="intro-section">
          <h1>Skyluc Projects, Logistics & Transport</h1>
          <p className="description">
            A trusted South African company delivering traditional logistics and transport services, enhanced by cutting-edge automation, instrumentation, and sensor technologies — smarter, safer, and more efficient supply chains.
          </p>
        </div>

        <div className="scrolling-text-container">
          <div className="scrolling-text">
            Project Management • Warehousing & Inventory • Fleet Tracking & Security • Smart Routing & Analytics • Automation & Sensor Integration • Real-Time Monitoring • Predictive Maintenance • Efficient Delivery •
          </div>
        </div>

        <div className="services-container">
          {services.map(({ title, desc, img }, index) => (
            <div
              key={title}
              className="service-card"
              ref={(el) => (cardsRef.current[index] = el)}
            >
              <img src={img} alt={`${title} image`} className="service-image" />
              <div className="card-content">
                <h3>{title}</h3>
                <p className="service-desc">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
};

export default HeroSection;
