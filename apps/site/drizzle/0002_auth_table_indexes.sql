CREATE INDEX "Account_userId_idx" ON "Account" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "Session_userId_idx" ON "Session" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "Verification_identifier_idx" ON "Verification" USING btree ("identifier");