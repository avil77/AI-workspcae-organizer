import React from 'react';

interface HeaderProps {
    isSignedIn: boolean;
    userProfile?: {
      name: string;
      imageUrl: string;
    };
    onSignIn: () => void;
    onSignOut: () => void;
    isGapiReady: boolean;
}

export const Header: React.FC<HeaderProps> = ({ isSignedIn, userProfile, onSignIn, onSignOut, isGapiReady }) => {
  return (
    <header className="text-center relative">
        <div className="absolute top-0 left-0">
            {isGapiReady && (
                 isSignedIn ? (
                    <div className="flex items-center gap-2 bg-gray-800 p-2 rounded-full">
                        <img src={userProfile?.imageUrl} alt={userProfile?.name} className="w-8 h-8 rounded-full" />
                        <button onClick={onSignOut} className="text-sm text-gray-300 hover:text-white pr-2">
                            יציאה
                        </button>
                    </div>
                ) : (
                    <button 
                        onClick={onSignIn} 
                        className="bg-white text-gray-800 font-semibold py-2 px-4 rounded-lg flex items-center gap-2 hover:bg-gray-200 transition-colors"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                            <path fill="#4285F4" d="M24 9.5c3.23 0 5.89 1.34 7.87 3.12l6.09-6.09C34.01 2.52 29.37 0 24 0 14.52 0 6.46 5.39 2.74 13.01l7.39 5.71C11.53 12.96 17.27 9.5 24 9.5z"></path>
                            <path fill="#34A853" d="M46.24 24.53c0-1.66-.15-3.28-.43-4.83H24v9.09h12.5c-.54 2.92-2.19 5.41-4.7 7.12l7.15 5.53c4.18-3.85 6.72-9.61 6.72-16.91z"></path>
                            <path fill="#FBBC05" d="M10.13 18.72c-1.12 3.33-1.12 7.03 0 10.36l-7.39 5.71C.96 30.22 0 27.21 0 24c0-3.21.96-6.22 2.74-8.72l7.39 3.44z"></path>
                            <path fill="#EA4335" d="M24 48c5.37 0 10.01-1.75 13.3-4.68l-7.15-5.53c-2.31 1.55-5.23 2.47-8.15 2.47-6.73 0-12.47-3.46-15.13-8.58l-7.39 5.71C6.46 42.61 14.52 48 24 48z"></path>
                            <path fill="none" d="M0 0h48v48H0z"></path>
                        </svg>
                        כניסה עם Google
                    </button>
                )
            )}
        </div>

      <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500 pt-14 sm:pt-0">
        מארגן חכם
      </h1>
      <p className="mt-2 text-lg text-gray-400">
        הדביקו טקסט, וקבלו הצעות לאירועים ומשימות
      </p>
    </header>
  );
};