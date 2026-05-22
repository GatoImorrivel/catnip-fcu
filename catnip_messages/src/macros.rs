/// Defines a request type, its [`Request`](crate::Request) impl, and a matching response enum variant.
///
/// Request structs include a `message_id` field that the **sender** must populate before
/// transmission; nothing in this crate generates ids.
macro_rules! define_request {
    ($variant:ident => $reply:ty) => {
        paste::paste! {
            #[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
            pub struct [<$variant Request>] {
                /// Correlation id assigned by the request sender.
                pub message_id: uuid::Uuid,
            }

            impl crate::Request for [<$variant Request>] {
                type Reply = $reply;

                fn reply(
                    &self,
                    reply: Self::Reply,
                    transport: &mut impl crate::Transport,
                ) -> anyhow::Result<()> {
                    transport.reply(self.message_id, reply)?;
                    Ok(())
                }
            }
        }
    };
    ($variant:ident { $($field:ident: $ftype:ty),* $(,)? } => $reply:ty) => {
        paste::paste! {
            #[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
            pub struct [<$variant Request>] {
                /// Correlation id assigned by the request sender.
                pub message_id: uuid::Uuid,
                $( pub $field: $ftype, )*
            }

            impl crate::Request for [<$variant Request>] {
                type Reply = $reply;

                fn reply(
                    &self,
                    reply: Self::Reply,
                    transport: &mut impl crate::Transport,
                ) -> anyhow::Result<()> {
                    transport.reply(self.message_id, reply)?;
                    Ok(())
                }
            }
        }
    };
}

/// Defines request/response enums and their request types from a declaration list.
///
/// Each request struct gets a `message_id` field that the **sender** must set before sending.
macro_rules! define_requests {
    (
        requests $req_enum:ident,
        responses $resp_enum:ident,
        { $($tt:tt)* }
    ) => {
        define_requests! {
            @munch
            $req_enum,
            $resp_enum,
            { $($tt)* }
            {}
            {}
            {}
        }
    };
    (
        @munch
        $req_enum:ident,
        $resp_enum:ident,
        { $variant:ident => $reply:ty $(, $($rest:tt)*)? }
        { $($req_variants:tt)* }
        { $($resp_variants:tt)* }
        { $($match_arms:tt)* }
    ) => {
        define_request! { $variant => $reply }
        paste::paste! {
            define_requests! {
                @munch
                $req_enum,
                $resp_enum,
                { $($($rest)*)? }
                { $($req_variants)* $variant([<$variant Request>]), }
                { $($resp_variants)* $variant { message_id: uuid::Uuid, reply: $reply }, }
                { $($match_arms)* Self::$variant { message_id, .. } => *message_id, }
            }
        }
    };
    (
        @munch
        $req_enum:ident,
        $resp_enum:ident,
        { $variant:ident { $($field:ident: $ftype:ty),* $(,)? } => $reply:ty $(, $($rest:tt)*)? }
        { $($req_variants:tt)* }
        { $($resp_variants:tt)* }
        { $($match_arms:tt)* }
    ) => {
        define_request! { $variant { $($field: $ftype),* } => $reply }
        paste::paste! {
            define_requests! {
                @munch
                $req_enum,
                $resp_enum,
                { $($($rest)*)? }
                { $($req_variants)* $variant([<$variant Request>]), }
                { $($resp_variants)* $variant { message_id: uuid::Uuid, reply: $reply }, }
                { $($match_arms)* Self::$variant { message_id, .. } => *message_id, }
            }
        }
    };
    (
        @munch
        $req_enum:ident,
        $resp_enum:ident,
        {}
        { $($req_variants:tt)* }
        { $($resp_variants:tt)* }
        { $($match_arms:tt)* }
    ) => {
        #[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
        pub enum $req_enum {
            $($req_variants)*
        }

        #[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
        pub enum $resp_enum {
            $($resp_variants)*
        }

        impl $resp_enum {
            pub fn message_id(&self) -> uuid::Uuid {
                match self {
                    $($match_arms)*
                }
            }
        }
    };
}
