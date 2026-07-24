export declare function sendEmail(to: string, subject: string, html: string): Promise<void>;
export declare function generateVerificationToken(): {
    token: string;
    hash: string;
};
export declare function sendVerificationEmail(email: string, token: string): Promise<void>;
export declare function sendPasswordResetEmail(email: string, token: string): Promise<void>;
//# sourceMappingURL=email.d.ts.map