/// Defines a per-engine fire mode enum plus [`FireMode`](crate::firemode::FireMode) and
/// [`PersistableFireModeAssignment`](crate::firemode::PersistableFireModeAssignment) impls.
///
/// ```ignore
/// define_firemode_system! {
///     pub enum FireMode,
///     {
///         Safe,
///         FullAuto(FullAutoConfig),
///     }
/// }
/// ```
#[macro_export]
macro_rules! define_firemode_system {
    (
        $(#[$enum_meta:meta])*
        $vis:vis enum $enum_name:ident,
        {
            $(
                $mode:ident $( ( $config:ty ) )?
            ),* $(,)?
        }
    ) => {
        $(#[$enum_meta])*
        #[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
        $vis enum $enum_name {
            $(
                $mode $( ( $config ) )?,
            )*
        }

        impl $crate::firemode::FireMode for $enum_name {
            fn wire_name(&self) -> &'static str {
                $crate::define_firemode_system! {
                    @match_wire_name
                    $enum_name,
                    self,
                    { $($mode $( ( $config ) )? ;)* }
                }
            }

            fn schema(&self) -> $crate::firemode::FireModeConfigFields {
                $crate::define_firemode_system! {
                    @match_schema
                    $enum_name,
                    self,
                    { $($mode $( ( $config ) )? ;)* }
                }
            }

            fn values(&self) -> ::std::collections::HashMap<::std::string::String, ::std::string::String> {
                $crate::define_firemode_system! {
                    @match_values
                    $enum_name,
                    self,
                    { $($mode $( ( $config ) )? ;)* }
                }
            }

            fn from_wire(
                name: &str,
                values: ::std::collections::HashMap<::std::string::String, ::std::string::String>,
            ) -> ::anyhow::Result<Self> {
                $crate::define_firemode_system! {
                    @match_from_wire
                    $enum_name,
                    name,
                    values,
                    { $($mode $( ( $config ) )? ;)* }
                }
            }

            fn supported() -> Vec<Self> {
                vec![
                    $(
                        $crate::define_firemode_system! { @supported $enum_name, $mode $(, $config)? }
                    ),*
                ]
            }

            fn from_name_for_schema(name: &str) -> ::anyhow::Result<Self> {
                $crate::define_firemode_system! {
                    @match_from_name_for_schema
                    $enum_name,
                    name,
                    { $($mode $( ( $config ) )? ;)* }
                }
            }
        }

        impl $crate::firemode::PersistableFireModeAssignment for $enum_name {
            fn save_assignment(
                &self,
                storage: &impl $crate::PositionAssignmentStorage,
                position: usize,
            ) -> ::anyhow::Result<()> {
                storage.save_assignment(position, self)
            }
        }
    };

    (@supported $enum_name:ident, $mode:ident) => {
        $enum_name::$mode
    };
    (@supported $enum_name:ident, $mode:ident, $config:ty) => {
        $enum_name::$mode(<$config as ::core::default::Default>::default())
    };

    (
        @match_wire_name
        $enum_name:ident,
        $value:ident,
        { $($rest:tt)* }
    ) => {
        $crate::define_firemode_system! {
            @match_wire_name_collect
            $enum_name,
            $value,
            { [] }
            { $($rest)* }
        }
    };

    (
        @match_wire_name_collect
        $enum_name:ident,
        $value:ident,
        { [ $($arms:tt)* ] }
        {}
    ) => {
        match $value {
            $($arms)*
        }
    };

    (
        @match_wire_name_collect
        $enum_name:ident,
        $value:ident,
        { [ $($arms:tt)* ] }
        { $mode:ident ; $($rest:tt)* }
    ) => {
        $crate::define_firemode_system! {
            @match_wire_name_collect
            $enum_name,
            $value,
            { [ $($arms)* $enum_name::$mode => stringify!($mode), ] }
            { $($rest)* }
        }
    };

    (
        @match_wire_name_collect
        $enum_name:ident,
        $value:ident,
        { [ $($arms:tt)* ] }
        { $mode:ident ( $config:ty ) ; $($rest:tt)* }
    ) => {
        $crate::define_firemode_system! {
            @match_wire_name_collect
            $enum_name,
            $value,
            { [ $($arms)* $enum_name::$mode(_) => stringify!($mode), ] }
            { $($rest)* }
        }
    };

    (
        @match_schema
        $enum_name:ident,
        $value:ident,
        { $($rest:tt)* }
    ) => {
        $crate::define_firemode_system! {
            @match_schema_collect
            $enum_name,
            $value,
            { [] }
            { $($rest)* }
        }
    };

    (
        @match_schema_collect
        $enum_name:ident,
        $value:ident,
        { [ $($arms:tt)* ] }
        {}
    ) => {
        match $value {
            $($arms)*
        }
    };

    (
        @match_schema_collect
        $enum_name:ident,
        $value:ident,
        { [ $($arms:tt)* ] }
        { $mode:ident ; $($rest:tt)* }
    ) => {
        $crate::define_firemode_system! {
            @match_schema_collect
            $enum_name,
            $value,
            { [ $($arms)* $enum_name::$mode => ::std::vec::Vec::new(), ] }
            { $($rest)* }
        }
    };

    (
        @match_schema_collect
        $enum_name:ident,
        $value:ident,
        { [ $($arms:tt)* ] }
        { $mode:ident ( $config:ty ) ; $($rest:tt)* }
    ) => {
        $crate::define_firemode_system! {
            @match_schema_collect
            $enum_name,
            $value,
            { [ $($arms)* $enum_name::$mode(_) => <$config as $crate::firemode::FireModeConfig>::shape(), ] }
            { $($rest)* }
        }
    };

    (
        @match_values
        $enum_name:ident,
        $value:ident,
        { $($rest:tt)* }
    ) => {
        $crate::define_firemode_system! {
            @match_values_collect
            $enum_name,
            $value,
            { [] }
            { $($rest)* }
        }
    };

    (
        @match_values_collect
        $enum_name:ident,
        $value:ident,
        { [ $($arms:tt)* ] }
        {}
    ) => {
        match $value {
            $($arms)*
        }
    };

    (
        @match_values_collect
        $enum_name:ident,
        $value:ident,
        { [ $($arms:tt)* ] }
        { $mode:ident ; $($rest:tt)* }
    ) => {
        $crate::define_firemode_system! {
            @match_values_collect
            $enum_name,
            $value,
            { [ $($arms)* $enum_name::$mode => ::std::collections::HashMap::new(), ] }
            { $($rest)* }
        }
    };

    (
        @match_values_collect
        $enum_name:ident,
        $value:ident,
        { [ $($arms:tt)* ] }
        { $mode:ident ( $config:ty ) ; $($rest:tt)* }
    ) => {
        $crate::define_firemode_system! {
            @match_values_collect
            $enum_name,
            $value,
            { [ $($arms)* $enum_name::$mode(config) => ::core::convert::Into::into(config.clone()), ] }
            { $($rest)* }
        }
    };

    (
        @match_from_wire
        $enum_name:ident,
        $name:ident,
        $values:ident,
        { $($rest:tt)* }
    ) => {
        $crate::define_firemode_system! {
            @match_from_wire_collect
            $enum_name,
            $name,
            $values,
            { [] }
            { $($rest)* }
        }
    };

    (
        @match_from_wire_collect
        $enum_name:ident,
        $name:ident,
        $values:ident,
        { [ $($arms:tt)* ] }
        {}
    ) => {
        match $name {
            $($arms)*
            _ => ::anyhow::bail!("unsupported firemode: {}", $name),
        }
    };

    (
        @match_from_wire_collect
        $enum_name:ident,
        $name:ident,
        $values:ident,
        { [ $($arms:tt)* ] }
        { $mode:ident ; $($rest:tt)* }
    ) => {
        $crate::define_firemode_system! {
            @match_from_wire_collect
            $enum_name,
            $name,
            $values,
            {
                [ $($arms)* stringify!($mode) => ::core::result::Result::Ok($enum_name::$mode), ]
            }
            { $($rest)* }
        }
    };

    (
        @match_from_wire_collect
        $enum_name:ident,
        $name:ident,
        $values:ident,
        { [ $($arms:tt)* ] }
        { $mode:ident ( $config:ty ) ; $($rest:tt)* }
    ) => {
        $crate::define_firemode_system! {
            @match_from_wire_collect
            $enum_name,
            $name,
            $values,
            {
                [ $($arms)*
                    stringify!($mode) => ::core::result::Result::Ok($enum_name::$mode(
                        ::core::convert::TryFrom::try_from($values)?,
                    )),
                ]
            }
            { $($rest)* }
        }
    };

    (
        @match_from_name_for_schema
        $enum_name:ident,
        $name:ident,
        { $($rest:tt)* }
    ) => {
        $crate::define_firemode_system! {
            @match_from_name_for_schema_collect
            $enum_name,
            $name,
            { [] }
            { $($rest)* }
        }
    };

    (
        @match_from_name_for_schema_collect
        $enum_name:ident,
        $name:ident,
        { [ $($arms:tt)* ] }
        {}
    ) => {
        match $name {
            $($arms)*
            _ => ::anyhow::bail!("unsupported firemode: {}", $name),
        }
    };

    (
        @match_from_name_for_schema_collect
        $enum_name:ident,
        $name:ident,
        { [ $($arms:tt)* ] }
        { $mode:ident ; $($rest:tt)* }
    ) => {
        $crate::define_firemode_system! {
            @match_from_name_for_schema_collect
            $enum_name,
            $name,
            {
                [ $($arms)* stringify!($mode) => ::core::result::Result::Ok($enum_name::$mode), ]
            }
            { $($rest)* }
        }
    };

    (
        @match_from_name_for_schema_collect
        $enum_name:ident,
        $name:ident,
        { [ $($arms:tt)* ] }
        { $mode:ident ( $config:ty ) ; $($rest:tt)* }
    ) => {
        $crate::define_firemode_system! {
            @match_from_name_for_schema_collect
            $enum_name,
            $name,
            {
                [ $($arms)*
                    stringify!($mode) => ::core::result::Result::Ok($enum_name::$mode(
                        <$config as ::core::default::Default>::default(),
                    )),
                ]
            }
            { $($rest)* }
        }
    };
}
