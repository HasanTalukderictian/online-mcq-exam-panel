function Footer({ site }) {
    return (
        <footer className="site-footer">
            <div className="site-footer-in">
                <span>
                    © {new Date().getFullYear()} {site.site_name}. All rights reserved.
                    {site.footer_text ? " " + site.footer_text : ""}
                </span>
                <span>
                    {site.contact_email ? (
                        <a className="dev-link" href={"mailto:" + site.contact_email}>{site.contact_email}</a>
                    ) : null}
                    {site.contact_phone ? <span> · {site.contact_phone}</span> : null}
                    {site.contact_email || site.contact_phone ? <span> · </span> : null}
                    Developed by{" "}
                    <a className="dev-link" href="https://hasan-portfilo.netlify.app/" target="_blank" rel="noopener noreferrer">
                        Hasan Talukder
                    </a>
                </span>
            </div>
        </footer>
    );
}

export default Footer;