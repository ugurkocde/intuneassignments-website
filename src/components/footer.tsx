import Link from "next/link";
import { Heart, Linkedin, Mail } from "lucide-react";

export function Footer() {
  return (
    <footer className="w-full border-t border-border bg-muted/30 text-muted-foreground py-12 text-sm">
      <div className="container mx-auto px-4 sm:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-8 mb-12">
          {/* Brand Column */}
          <div className="space-y-4 lg:col-span-1">
            <h3 className="text-foreground font-semibold text-base">Intune Assignment Checker</h3>
            <p className="text-muted-foreground leading-relaxed">
              Visualize and analyze your Microsoft Intune policy assignments for users and devices.
            </p>
          </div>

          {/* Product Column */}
          <div className="space-y-4">
            <h3 className="text-foreground font-semibold text-base">Product</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/dashboard" className="hover:text-foreground transition-colors">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link href="/interactive-graph" className="hover:text-foreground transition-colors">
                  Interactive Graph
                </Link>
              </li>
            </ul>
          </div>

          {/* More Column */}
          <div className="space-y-4">
            <h3 className="text-foreground font-semibold text-base">More</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/privacy" className="hover:text-foreground transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-foreground transition-colors">
                  Terms of Use
                </Link>
              </li>
            </ul>
          </div>

          {/* Connect Column */}
          <div className="space-y-4">
            <h3 className="text-foreground font-semibold text-base">Connect</h3>
            <ul className="space-y-3">
              <li>
                <a 
                  href="https://www.linkedin.com/in/ugurkocde/" 
                  target="_blank" 
                  rel="noreferrer" 
                  className="flex items-center gap-2 hover:text-foreground transition-colors"
                >
                  <Linkedin className="h-4 w-4" />
                  LinkedIn
                </a>
              </li>
              <li>
                <a 
                  href="mailto:support@ugurlabs.com" 
                  className="flex items-center gap-2 hover:text-foreground transition-colors"
                >
                  <Mail className="h-4 w-4" />
                  support@ugurlabs.com
                </a>
              </li>
            </ul>
          </div>

          {/* Related Products Column */}
          <div className="space-y-4">
            <h3 className="text-foreground font-semibold text-base">Related Products</h3>
            <ul className="space-y-4">
              <li>
                <a href="https://intunedocumentation.com" target="_blank" rel="noreferrer" className="block group">
                  <span className="text-foreground font-medium group-hover:text-primary transition-colors">IntuneDocumentation</span>
                  <p className="text-xs mt-1 text-muted-foreground">Free PDF documentation generator for Microsoft Intune</p>
                </a>
              </li>
              <li>
                <a href="https://tenuvault.com" target="_blank" rel="noreferrer" className="block group">
                  <span className="text-foreground font-medium group-hover:text-primary transition-colors">TenuVault</span>
                  <p className="text-xs mt-1 text-muted-foreground">Free, open-source Intune backup and recovery solution</p>
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} <a href="https://ugurlabs.com" target="_blank" rel="noreferrer" className="hover:text-foreground transition-colors">Ugur Creative Labs</a>. All rights reserved.
          </p>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span>Made with</span>
            <Heart className="h-3 w-3 text-red-500 fill-red-500" />
            <span>by <a href="https://www.linkedin.com/in/ugurkocde/" target="_blank" rel="noreferrer" className="hover:text-foreground transition-colors">Ugur</a></span>
          </div>
        </div>
      </div>
    </footer>
  );
}
