use proc_macro::TokenStream;
use proc_macro2::Span;
use quote::quote;
use syn::{
    parse::Parser, parse_macro_input, punctuated::Punctuated, spanned::Spanned, Data, DeriveInput,
    Expr, Fields, Lit, Meta, MetaNameValue, Token, Type,
};

#[proc_macro_derive(FireModeConfig, attributes(field))]
pub fn derive_fire_mode_config(input: TokenStream) -> TokenStream {
    let input = parse_macro_input!(input as DeriveInput);
    match expand(&input) {
        Ok(tokens) => tokens.into(),
        Err(err) => err.to_compile_error().into(),
    }
}

struct FieldAttrs {
    display_name: String,
    min: Option<i32>,
    max: Option<i32>,
    default_i32: Option<i32>,
    default_bool: Option<bool>,
    unit: Option<syn::Path>,
}

enum FieldKind {
    I32(FieldAttrs),
    Bool(FieldAttrs),
}

fn expand(input: &DeriveInput) -> syn::Result<proc_macro2::TokenStream> {
    let struct_name = &input.ident;
    let Data::Struct(data) = &input.data else {
        return Err(syn::Error::new(
            input.ident.span(),
            "FireModeConfig can only be derived for structs",
        ));
    };
    let Fields::Named(fields) = &data.fields else {
        return Err(syn::Error::new(
            input.ident.span(),
            "FireModeConfig requires a struct with named fields",
        ));
    };

    let mut shape_entries = Vec::new();
    let mut try_from_fields = Vec::new();
    let mut from_inserts = Vec::new();
    let mut default_fields = Vec::new();

    for field in &fields.named {
        let ident = field
            .ident
            .as_ref()
            .ok_or_else(|| syn::Error::new(field.span(), "tuple fields are not supported"))?;
        let key = ident.to_string();
        let attrs = parse_field_attrs(&field.attrs)?;
        let kind = classify_field(&field.ty, attrs)?;

        match kind {
            FieldKind::I32(attrs) => {
                let display_name = &attrs.display_name;
                let min = attrs.min.ok_or_else(|| {
                    syn::Error::new(
                        field.span(),
                        "i32 fields require #[field(min = ..., max = ...)]",
                    )
                })?;
                let max = attrs.max.ok_or_else(|| {
                    syn::Error::new(
                        field.span(),
                        "i32 fields require #[field(min = ..., max = ...)]",
                    )
                })?;
                let unit = attrs.unit.ok_or_else(|| {
                    syn::Error::new(field.span(), "i32 fields require #[field(unit = ...)]")
                })?;
                let d = attrs.default_i32.ok_or_else(|| {
                    syn::Error::new(
                        field.span(),
                        "i32 fields require #[field(default = ...)]",
                    )
                })?;
                default_fields.push(quote! { #ident: #d });

                shape_entries.push(quote! {
                    {
                        let mut map = ::std::collections::HashMap::new();
                        map.insert(
                            #key.to_string(),
                            ::catnip_core::firemode::FireModeConfigSchemaEntry::Numeric(
                                ::catnip_core::firemode::FireModeConfigSchema {
                                    display_name: #display_name.to_string(),
                                    min: #min,
                                    max: #max,
                                    default: #d,
                                    unit: ::catnip_core::firemode::FireModeConfigTypeUnit::#unit,
                                },
                            ),
                        );
                        map
                    }
                });

                try_from_fields.push(quote! {
                    #ident: ::catnip_core::firemode::required_i32(&map, #key, #min, #max)?,
                });
                from_inserts.push(quote! {
                    ::catnip_core::firemode::insert_i32(&mut map, #key, config.#ident);
                });
            }
            FieldKind::Bool(attrs) => {
                let display_name = &attrs.display_name;
                let default_bool = attrs.default_bool.ok_or_else(|| {
                    syn::Error::new(
                        field.span(),
                        "bool fields require #[field(default = true/false)]",
                    )
                })?;
                default_fields.push(quote! { #ident: #default_bool });

                shape_entries.push(quote! {
                    {
                        let mut map = ::std::collections::HashMap::new();
                        map.insert(
                            #key.to_string(),
                            ::catnip_core::firemode::FireModeConfigSchemaEntry::Boolean(
                                ::catnip_core::firemode::FireModeConfigSchemaBool {
                                    display_name: #display_name.to_string(),
                                    default: #default_bool,
                                },
                            ),
                        );
                        map
                    }
                });

                try_from_fields.push(quote! {
                    #ident: ::catnip_core::firemode::required_bool(&map, #key)?,
                });
                from_inserts.push(quote! {
                    ::catnip_core::firemode::insert_bool(&mut map, #key, config.#ident);
                });
            }
        }
    }

    let default_impl = if default_fields.is_empty() {
        quote! {}
    } else {
        quote! {
            impl ::core::default::Default for #struct_name {
                fn default() -> Self {
                    Self {
                        #( #default_fields, )*
                    }
                }
            }
        }
    };

    Ok(quote! {
        impl ::catnip_core::firemode::FireModeConfig for #struct_name {
            fn shape() -> ::catnip_core::firemode::FireModeConfigFields {
                vec![ #( #shape_entries, )* ]
            }
        }

        impl ::core::convert::TryFrom<::std::collections::HashMap<::std::string::String, ::std::string::String>>
            for #struct_name
        {
            type Error = ::anyhow::Error;

            fn try_from(map: ::std::collections::HashMap<::std::string::String, ::std::string::String>) -> ::core::result::Result<Self, Self::Error> {
                Ok(Self {
                    #( #try_from_fields )*
                })
            }
        }

        impl ::core::convert::From<#struct_name> for ::std::collections::HashMap<::std::string::String, ::std::string::String> {
            fn from(config: #struct_name) -> Self {
                let mut map = ::std::collections::HashMap::new();
                #( #from_inserts )*
                map
            }
        }

        #default_impl
    })
}

fn classify_field(ty: &Type, attrs: FieldAttrs) -> syn::Result<FieldKind> {
    match ty {
        Type::Path(path) if path.path.is_ident("i32") => Ok(FieldKind::I32(attrs)),
        Type::Path(path) if path.path.is_ident("bool") => Ok(FieldKind::Bool(attrs)),
        _ => Err(syn::Error::new(
            ty.span(),
            "FireModeConfig only supports i32 and bool fields",
        )),
    }
}

fn parse_field_attrs(attrs: &[syn::Attribute]) -> syn::Result<FieldAttrs> {
    let mut display_name = None;
    let mut min = None;
    let mut max = None;
    let mut default_i32 = None;
    let mut default_bool = None;
    let mut unit = None;

    for attr in attrs {
        if !attr.path().is_ident("field") {
            continue;
        }
        let Meta::List(list) = &attr.meta else {
            return Err(syn::Error::new(attr.span(), "expected #[field(...)]"));
        };
        let nested =
            Punctuated::<Meta, Token![,]>::parse_terminated.parse2(list.tokens.clone())?;
        for meta in nested {
            let Meta::NameValue(MetaNameValue { path, value, .. }) = meta else {
                return Err(syn::Error::new(
                    meta.span(),
                    "field attribute values must be name = value",
                ));
            };
            let key = path
                .get_ident()
                .ok_or_else(|| syn::Error::new(path.span(), "unknown field attribute"))?;
            match key.to_string().as_str() {
                "display_name" => {
                    display_name = Some(lit_str(&value, "display_name")?);
                }
                "min" => min = Some(lit_i32(&value, "min")?),
                "max" => max = Some(lit_i32(&value, "max")?),
                "default" => {
                    if let Expr::Lit(expr_lit) = &value {
                        match &expr_lit.lit {
                            Lit::Int(i) => default_i32 = Some(i.base10_parse()?),
                            Lit::Bool(b) => default_bool = Some(b.value),
                            _ => {
                                return Err(syn::Error::new(
                                    value.span(),
                                    "default must be an integer or bool literal",
                                ));
                            }
                        }
                    } else {
                        return Err(syn::Error::new(
                            value.span(),
                            "default must be a literal",
                        ));
                    }
                }
                "unit" => {
                    if let Expr::Path(expr_path) = &value {
                        unit = Some(expr_path.path.clone());
                    } else {
                        return Err(syn::Error::new(value.span(), "unit must be a path"));
                    }
                }
                other => {
                    return Err(syn::Error::new(
                        path.span(),
                        format!("unknown field attribute `{other}`"),
                    ));
                }
            }
        }
    }

    let display_name = display_name.ok_or_else(|| {
        syn::Error::new(Span::call_site(), "missing #[field(display_name = \"...\")]")
    })?;

    Ok(FieldAttrs {
        display_name,
        min,
        max,
        default_i32,
        default_bool,
        unit,
    })
}

fn lit_str(expr: &Expr, name: &str) -> syn::Result<String> {
    if let Expr::Lit(expr_lit) = expr {
        if let Lit::Str(s) = &expr_lit.lit {
            return Ok(s.value());
        }
    }
    Err(syn::Error::new(
        expr.span(),
        format!("{name} must be a string literal"),
    ))
}

fn lit_i32(expr: &Expr, name: &str) -> syn::Result<i32> {
    if let Expr::Lit(expr_lit) = expr {
        if let Lit::Int(i) = &expr_lit.lit {
            return i.base10_parse();
        }
    }
    Err(syn::Error::new(
        expr.span(),
        format!("{name} must be an integer literal"),
    ))
}
