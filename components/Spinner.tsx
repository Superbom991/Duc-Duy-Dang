
import React from 'react';

interface SpinnerProps {
    size?: 'sm' | 'md' | 'lg';
}

export const Spinner: React.FC<SpinnerProps> = ({ size = 'md' }) => {
    const sizeClasses = {
        sm: 'w-5 h-5',
        md: 'w-8 h-8',
        lg: 'w-12 h-12',
    };

    return (
        <div
            className={`animate-spin rounded-full border-t-2 border-b-2 border-amber-300 ${sizeClasses[size]}`}
            role="status"
        >
            <span className="sr-only">Loading...</span>
        </div>
    );
};
