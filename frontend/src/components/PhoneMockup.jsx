'use client'

export function PhoneMockup({ src, alt = "iMoney app" }) {
  return (
    <div className="phone-wrapper">
      <div className="phone-frame">

        {/* Tela */}
        <div className="phone-screen">

          {/* Notch dinâmica */}
          <div className="phone-notch" />

          {/* Screenshot do app */}
          <img
            src={src}
            alt={alt}
            className="phone-screenshot"
          />

          {/* Reflection overlay sutil */}
          <div className="phone-reflection" />
        </div>

        {/* Botão lateral direito */}
        <div className="phone-btn-right" />

        {/* Botões de volume esquerdo */}
        <div className="phone-btn-vol-1" />
        <div className="phone-btn-vol-2" />
      </div>

      <style>{`
        .phone-wrapper {
          perspective: 1200px;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 40px 20px;
        }

        .phone-frame {
          position: relative;
          width: 260px;
          height: 530px;
          border-radius: 46px;
          background: linear-gradient(145deg, #2a2a2a 0%, #111111 100%);
          padding: 10px;
          box-shadow:
            0 0 0 1px rgba(255,255,255,0.08),
            0 0 0 2px rgba(0,0,0,0.6),
            24px 48px 96px rgba(0,0,0,0.35),
            0 8px 32px rgba(0,0,0,0.2);
          transform: rotateY(-18deg) rotateX(4deg) translateZ(0);
          animation: phonefloat 5s ease-in-out infinite;
          will-change: transform;
        }

        .phone-screen {
          width: 100%;
          height: 100%;
          border-radius: 38px;
          overflow: hidden;
          background: #000;
          position: relative;
        }

        .phone-notch {
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 88px;
          height: 26px;
          background: #111;
          border-radius: 0 0 18px 18px;
          z-index: 10;
        }

        .phone-screenshot {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: top center;
          display: block;
        }

        .phone-reflection {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            135deg,
            rgba(255,255,255,0.06) 0%,
            transparent 50%,
            rgba(0,0,0,0.04) 100%
          );
          pointer-events: none;
          border-radius: 38px;
        }

        /* Botão lateral direito */
        .phone-btn-right {
          position: absolute;
          right: -5px;
          top: 110px;
          width: 5px;
          height: 64px;
          background: linear-gradient(to right, #1a1a1a, #2e2e2e);
          border-radius: 0 4px 4px 0;
        }

        /* Volume superior */
        .phone-btn-vol-1 {
          position: absolute;
          left: -5px;
          top: 88px;
          width: 5px;
          height: 34px;
          background: linear-gradient(to left, #1a1a1a, #2e2e2e);
          border-radius: 4px 0 0 4px;
        }

        /* Volume inferior */
        .phone-btn-vol-2 {
          position: absolute;
          left: -5px;
          top: 132px;
          width: 5px;
          height: 34px;
          background: linear-gradient(to left, #1a1a1a, #2e2e2e);
          border-radius: 4px 0 0 4px;
        }

        @keyframes phonefloat {
          0%, 100% {
            transform: rotateY(-18deg) rotateX(4deg) translateY(0px);
          }
          50% {
            transform: rotateY(-18deg) rotateX(4deg) translateY(-14px);
          }
        }

        @media (max-width: 768px) {
          .phone-frame {
            width: 200px;
            height: 408px;
            transform: rotateY(0deg) rotateX(0deg);
            animation: phonefloat-mobile 5s ease-in-out infinite;
          }

          @keyframes phonefloat-mobile {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
          }
        }
      `}</style>
    </div>
  )
}
